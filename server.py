"""Same Word: one-process HTTP and WebSocket server.

Run ``python server.py`` and open http://127.0.0.1:8000.
Requires only the ``websockets`` package (see requirements.txt).
"""

from __future__ import annotations

import argparse
import asyncio
from dataclasses import dataclass, field
from http import HTTPStatus
import json
import mimetypes
from pathlib import Path
import random
import re
import secrets
import time
import unicodedata
from urllib.parse import urlsplit

from websockets.asyncio.server import ServerConnection, serve
from websockets.datastructures import Headers
from websockets.http11 import Request, Response
from websockets.exceptions import ConnectionClosed

from questions import select_questions


STATIC_DIR = Path(__file__).parent / "static"
PUBLIC_FILES = {"/": "index.html", "/index.html": "index.html", "/styles.css": "styles.css", "/app.js": "app.js"}
ROOMS: dict[str, Room] = {}
ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
RECONNECT_GRACE_SECONDS = 10
MAX_ROOMS = 1000


def normalized_word(value: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", value).split()).casefold()


def clean_name(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("请输入昵称")
    name = " ".join(value.split())
    if not 1 <= len(name) <= 20:
        raise ValueError("昵称需为 1–20 个字符")
    return name


def clean_word(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("请输入一个词")
    word = " ".join(value.split())
    if not 1 <= len(word) <= 24:
        raise ValueError("词语需为 1–24 个字符")
    return word


def clean_int(value: object, allowed: set[int], message: str) -> int:
    if type(value) is not int or value not in allowed:
        raise ValueError(message)
    return value


@dataclass
class Player:
    id: str
    token: str
    name: str
    socket: ServerConnection | None
    disconnect_task: asyncio.Task | None = None


@dataclass
class Room:
    code: str
    mode: str
    capacity: int
    duration: int
    question_count: int = 10
    category: str = "all"
    players: dict[str, Player] = field(default_factory=dict)
    host_id: str = ""
    phase: str = "lobby"
    round_number: int = 0
    deadline: float | None = None
    submissions: dict[str, str | int] = field(default_factory=dict)
    history: list[dict] = field(default_factory=list)
    question_deck: list[dict] = field(default_factory=list)
    timer_task: asyncio.Task | None = None
    version: int = 0
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    def snapshot(self, viewer_id: str) -> dict:
        players = list(self.players.values())
        data = {
            "type": "state",
            "version": self.version,
            "code": self.code,
            "mode": self.mode,
            "capacity": self.capacity,
            "duration": self.duration,
            "questionCount": self.question_count,
            "category": self.category,
            "phase": self.phase,
            "round": self.round_number,
            "deadline": self.deadline,
            "hostId": self.host_id,
            "selfId": viewer_id,
            "players": [
                {"id": p.id, "name": p.name, "connected": p.socket is not None,
                 "submitted": p.id in self.submissions, "isHost": p.id == self.host_id}
                for p in players
            ],
            "history": self.history,
            "ownAnswer": self.submissions.get(viewer_id),
        }
        if self.mode == "quiz" and self.phase == "writing" and self.question_deck:
            data["question"] = self.question_deck[self.round_number - 1]
        if self.mode == "quiz" and self.phase == "finished":
            data["score"] = quiz_score(self)
        return data

    def bump(self) -> None:
        self.version += 1


def new_code() -> str:
    for _ in range(100):
        code = "".join(secrets.choice(ROOM_CODE_ALPHABET) for _ in range(6))
        if code not in ROOMS:
            return code
    raise ValueError("房间创建繁忙，请重试")


async def send_json(socket: ServerConnection, data: dict) -> None:
    try:
        await socket.send(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    except ConnectionClosed:
        pass


async def send_error(socket: ServerConnection, message: str) -> None:
    await send_json(socket, {"type": "error", "message": message})


async def broadcast(room: Room) -> None:
    # Build each player's view separately: submitted words stay private until reveal.
    packets = [(p.socket, room.snapshot(p.id)) for p in room.players.values() if p.socket]
    await asyncio.gather(*(send_json(socket, data) for socket, data in packets))


def cancel_timer(room: Room) -> None:
    if room.timer_task and room.timer_task is not asyncio.current_task():
        room.timer_task.cancel()
    room.timer_task = None


def begin_round(room: Room, *, reset: bool = False) -> None:
    cancel_timer(room)
    if reset:
        room.round_number = 0
        room.history.clear()
        if room.mode == "quiz":
            room.question_deck = select_questions(room.category, room.question_count, random.SystemRandom())
    room.round_number += 1
    room.phase = "writing"
    room.submissions.clear()
    room.deadline = time.time() + room.duration
    room.bump()
    room.timer_task = asyncio.create_task(round_timer(room, room.round_number, room.deadline))


def resolve_round(room: Room) -> None:
    cancel_timer(room)
    entries = []
    for player in room.players.values():
        answer = room.submissions.get(player.id)
        entries.append({"playerId": player.id, "name": player.name, "answer": answer})
    if room.mode == "word":
        words = [normalized_word(e["answer"]) if isinstance(e["answer"], str) else "" for e in entries]
        matched = bool(words) and all(words) and len(set(words)) == 1
    else:
        choices = [e["answer"] for e in entries]
        matched = bool(choices) and all(c is not None for c in choices) and len(set(choices)) == 1
    result = {"round": room.round_number, "answers": entries, "matched": matched}
    if room.mode == "quiz":
        result["question"] = room.question_deck[room.round_number - 1]
    room.history.append(result)
    room.phase = "finished" if (room.mode == "word" and matched) or (room.mode == "quiz" and room.round_number >= room.question_count) else "reveal"
    room.deadline = None
    room.bump()


async def round_timer(room: Room, round_number: int, deadline: float) -> None:
    try:
        await asyncio.sleep(max(0, deadline - time.time()))
        async with room.lock:
            if room.phase != "writing" or room.round_number != round_number or room.deadline != deadline:
                return
            resolve_round(room)
        await broadcast(room)
    except asyncio.CancelledError:
        return


def quiz_score(room: Room) -> int:
    matched_pairs = 0
    possible_pairs = 0
    for item in room.history:
        answers = [entry["answer"] for entry in item["answers"]]
        for i in range(len(answers)):
            for j in range(i + 1, len(answers)):
                possible_pairs += 1
                if answers[i] is not None and answers[i] == answers[j]:
                    matched_pairs += 1
    return round(100 * matched_pairs / possible_pairs) if possible_pairs else 0


async def remove_player(room: Room, player_id: str) -> None:
    async with room.lock:
        player = room.players.pop(player_id, None)
        if player is None:
            return
        if player.disconnect_task and player.disconnect_task is not asyncio.current_task():
            player.disconnect_task.cancel()
        room.submissions.pop(player_id, None)
        if room.host_id == player_id:
            room.host_id = next(iter(room.players), "")
        if not room.players:
            cancel_timer(room)
            ROOMS.pop(room.code, None)
            return
        if room.phase != "lobby":
            if len(room.players) < 2:
                cancel_timer(room)
                room.phase = "lobby"
                room.round_number = 0
                room.deadline = None
                room.history.clear()
                room.submissions.clear()
                room.capacity = 2
            else:
                room.capacity = len(room.players)
                if room.phase == "writing" and len(room.submissions) == len(room.players):
                    resolve_round(room)
        room.bump()
    await broadcast(room)


async def disconnect_later(room: Room, player_id: str) -> None:
    try:
        await asyncio.sleep(RECONNECT_GRACE_SECONDS)
        player = room.players.get(player_id)
        if player and player.socket is None:
            await remove_player(room, player_id)
    except asyncio.CancelledError:
        return


async def initial_message(socket: ServerConnection, data: dict) -> tuple[Room, Player]:
    action = data.get("type")
    if action == "create":
        if len(ROOMS) >= MAX_ROOMS:
            raise ValueError("当前房间较多，请稍后重试")
        name = clean_name(data.get("name"))
        mode = data.get("mode")
        if mode not in {"word", "quiz"}:
            raise ValueError("请选择游戏玩法")
        capacity = clean_int(data.get("capacity"), {2, 3, 4}, "请选择 2–4 人")
        duration = clean_int(data.get("duration"), set(range(5, 301)), "每轮时长需为 5–300 秒")
        count = clean_int(data.get("questionCount", 10), {5, 10, 15}, "请选择 5、10 或 15 题")
        category = data.get("category", "all")
        if category not in {"all", "daily", "imagination", "personality"}:
            raise ValueError("请选择题目分类")
        room = Room(new_code(), mode, capacity, duration, count, category)
        player = Player(secrets.token_hex(8), secrets.token_urlsafe(24), name, socket)
        room.players[player.id] = player
        room.host_id = player.id
        room.bump()
        ROOMS[room.code] = room
    elif action == "join":
        code = str(data.get("code", "")).strip().upper()
        if not re.fullmatch(r"[A-Z0-9]{6}", code):
            raise ValueError("请输入 6 位房间号")
        room = ROOMS.get(code)
        if room is None:
            raise ValueError("房间不存在或已结束")
        token = data.get("token")
        old_socket = None
        async with room.lock:
            player = next((p for p in room.players.values() if p.token == token), None) if token else None
            if player:
                old_socket = player.socket
                player.socket = socket
                if player.disconnect_task:
                    player.disconnect_task.cancel()
                    player.disconnect_task = None
            else:
                if room.phase != "lobby":
                    raise ValueError("这局游戏已经开始")
                if len(room.players) >= room.capacity:
                    raise ValueError("房间已经满员")
                name = clean_name(data.get("name"))
                player = Player(secrets.token_hex(8), secrets.token_urlsafe(24), name, socket)
                room.players[player.id] = player
            room.bump()
        if old_socket and old_socket is not socket:
            await old_socket.close(code=1000, reason="Reconnected elsewhere")
    else:
        raise ValueError("请先创建或加入房间")
    await send_json(socket, {"type": "welcome", "code": room.code, "playerId": player.id, "token": player.token})
    await broadcast(room)
    return room, player


async def room_action(socket: ServerConnection, room: Room, player: Player, data: dict) -> None:
    if room.players.get(player.id) is not player or player.socket is not socket:
        raise ValueError("房间连接已失效")
    action = data.get("type")
    if action == "leave":
        await remove_player(room, player.id)
        await socket.close()
        return
    async with room.lock:
        if action in {"start", "next", "restart"} and room.host_id != player.id:
            raise ValueError("请等待房主操作")
        if action == "start":
            if room.phase != "lobby" or len(room.players) != room.capacity or not all(p.socket for p in room.players.values()):
                raise ValueError("请等待玩家到齐")
            begin_round(room, reset=True)
        elif action == "next":
            if room.phase != "reveal":
                raise ValueError("当前无法进入下一轮")
            begin_round(room)
        elif action == "restart":
            if room.phase != "finished" or len(room.players) < 2:
                raise ValueError("当前无法再来一局")
            begin_round(room, reset=True)
        elif action == "submit":
            if room.phase != "writing" or room.deadline is None or time.time() >= room.deadline:
                raise ValueError("本轮已结束")
            if player.id in room.submissions:
                raise ValueError("答案已经锁定")
            if room.mode == "word":
                answer = clean_word(data.get("answer"))
                used = {normalized_word(entry["answer"]) for item in room.history for entry in item["answers"] if isinstance(entry["answer"], str)}
                if normalized_word(answer) in used:
                    raise ValueError("这个词在之前的轮次已出现，换一个吧")
            else:
                answer = clean_int(data.get("answer"), {0, 1, 2}, "请选择一个选项")
            room.submissions[player.id] = answer
            room.bump()
            if len(room.submissions) == len(room.players):
                resolve_round(room)
        else:
            raise ValueError("未知操作")
    await broadcast(room)


async def websocket_handler(socket: ServerConnection) -> None:
    room = None
    player = None
    try:
        async for raw in socket:
            try:
                data = json.loads(raw)
                if not isinstance(data, dict):
                    raise ValueError("消息格式错误")
                if room is None:
                    room, player = await initial_message(socket, data)
                else:
                    await room_action(socket, room, player, data)
            except (ValueError, TypeError, json.JSONDecodeError) as exc:
                await send_error(socket, str(exc))
    except ConnectionClosed:
        pass
    finally:
        if room and player:
            changed = False
            async with room.lock:
                if room.players.get(player.id) is player and player.socket is socket:
                    player.socket = None
                    player.disconnect_task = asyncio.create_task(disconnect_later(room, player.id))
                    room.bump()
                    changed = True
            if changed:
                await broadcast(room)


async def http_request(socket: ServerConnection, request: Request) -> Response | None:
    path = urlsplit(request.path).path
    if path == "/ws":
        origin = request.headers.get("Origin")
        host = request.headers.get("Host")
        if origin and (not host or urlsplit(origin).netloc != host):
            return Response(HTTPStatus.FORBIDDEN, "Forbidden", Headers({"Content-Type": "text/plain"}), b"Invalid origin")
        return None
    filename = PUBLIC_FILES.get(path)
    if filename is None:
        return Response(HTTPStatus.NOT_FOUND, "Not Found", Headers({"Content-Type": "text/plain"}), b"Not found")
    body = (STATIC_DIR / filename).read_bytes()
    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    headers = Headers({"Content-Type": content_type + ("; charset=utf-8" if content_type.startswith("text/") or content_type == "application/javascript" else ""), "Cache-Control": "no-store"})
    return Response(HTTPStatus.OK, "OK", headers, body)


async def main(host: str, port: int) -> None:
    async with serve(websocket_handler, host, port, process_request=http_request, max_size=8192):
        print(f"Same Word is running at http://{host}:{port}", flush=True)
        await asyncio.Future()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the Same Word game")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    try:
        asyncio.run(main(args.host, args.port))
    except KeyboardInterrupt:
        pass
