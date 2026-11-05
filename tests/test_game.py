import asyncio
import json
import time
import unittest
from urllib.request import urlopen

from websockets.asyncio.client import connect
from websockets.asyncio.server import serve

from server import ROOMS, http_request, websocket_handler


async def receive(socket, wanted):
    while True:
        message = json.loads(await asyncio.wait_for(socket.recv(), 2))
        if message["type"] == wanted:
            return message


async def send(socket, **message):
    await socket.send(json.dumps(message))


class GameIntegrationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        ROOMS.clear()
        self.server = await serve(websocket_handler, "127.0.0.1", 0, process_request=http_request)
        self.port = self.server.sockets[0].getsockname()[1]
        self.uri = f"ws://127.0.0.1:{self.port}/ws"
        self.sockets = []

    async def asyncTearDown(self):
        for socket in self.sockets:
            await socket.close()
        self.server.close()
        await self.server.wait_closed()
        for room in list(ROOMS.values()):
            if room.timer_task:
                room.timer_task.cancel()
        ROOMS.clear()

    async def player(self):
        socket = await connect(self.uri)
        self.sockets.append(socket)
        return socket

    async def create_pair(self, *, mode="word", question_count=5):
        a = await self.player()
        await send(a, type="create", name="甲", mode=mode, capacity=2, duration=30, questionCount=question_count, category="all")
        welcome_a = await receive(a, "welcome")
        await receive(a, "state")
        b = await self.player()
        await send(b, type="join", code=welcome_a["code"], name="乙")
        welcome_b = await receive(b, "welcome")
        await receive(b, "state")
        await receive(a, "state")
        return a, b, welcome_a, welcome_b

    async def test_http_and_word_game_privacy_repeat_and_win(self):
        def read_page():
            with urlopen(f"http://127.0.0.1:{self.port}/?r=ABC123") as response:
                return response.status, response.read()
        status, page = await asyncio.to_thread(read_page)
        self.assertEqual(status, 200)
        self.assertIn(b"/app.js", page)

        a, b, _, _ = await self.create_pair()
        await send(a, type="start")
        await receive(a, "state")
        await receive(b, "state")

        await send(a, type="submit", answer="大海")
        own = await receive(a, "state")
        other = await receive(b, "state")
        self.assertEqual(own["ownAnswer"], "大海")
        self.assertIsNone(other["ownAnswer"])
        self.assertNotIn("大海", json.dumps(other, ensure_ascii=False))
        self.assertTrue(other["players"][0]["submitted"])

        await send(b, type="submit", answer="天空")
        reveal_a = await receive(a, "state")
        reveal_b = await receive(b, "state")
        self.assertEqual(reveal_a["phase"], "reveal")
        self.assertEqual(reveal_b["history"][0]["answers"][0]["answer"], "大海")

        await send(a, type="next")
        await receive(a, "state")
        await receive(b, "state")
        await send(a, type="submit", answer="大海")
        error = await receive(a, "error")
        self.assertIn("之前", error["message"])

        await send(a, type="submit", answer="蓝色")
        await receive(a, "state")
        await receive(b, "state")
        await send(b, type="submit", answer="蓝色")
        finished_a = await receive(a, "state")
        finished_b = await receive(b, "state")
        self.assertEqual(finished_a["phase"], "finished")
        self.assertEqual(finished_b["round"], 2)
        self.assertEqual(len(finished_a["history"]), 2)
        self.assertTrue(finished_a["history"][-1]["matched"])

    async def test_quiz_runs_to_score_and_host_restarts(self):
        a, b, _, _ = await self.create_pair(mode="quiz", question_count=5)
        await send(a, type="start")
        first_a = await receive(a, "state")
        first_b = await receive(b, "state")
        self.assertEqual(first_a["phase"], "writing")
        self.assertEqual(len(first_b["question"]["optionsEn"]), 3)
        for round_number in range(1, 6):
            await send(a, type="submit", answer=0)
            await receive(a, "state")
            hidden = await receive(b, "state")
            self.assertIsNone(hidden["ownAnswer"])
            await send(b, type="submit", answer=0)
            result_a = await receive(a, "state")
            await receive(b, "state")
            self.assertEqual(result_a["round"], round_number)
            if round_number < 5:
                self.assertEqual(result_a["phase"], "reveal")
                await send(a, type="next")
                await receive(a, "state")
                await receive(b, "state")
        self.assertEqual(result_a["phase"], "finished")
        self.assertEqual(result_a["score"], 100)
        await send(a, type="restart")
        again = await receive(a, "state")
        self.assertEqual(again["round"], 1)
        self.assertEqual(again["phase"], "writing")
        self.assertEqual(again["history"], [])

    async def test_refresh_reconnects_with_same_identity(self):
        a, b, _, welcome_b = await self.create_pair()
        await b.close()
        disconnected = await receive(a, "state")
        self.assertFalse(disconnected["players"][1]["connected"])
        rejoined = await self.player()
        await send(rejoined, type="join", code=disconnected["code"], name="乙", token=welcome_b["token"])
        welcome_again = await receive(rejoined, "welcome")
        self.assertEqual(welcome_again["playerId"], welcome_b["playerId"])
        restored = await receive(rejoined, "state")
        self.assertTrue(restored["players"][1]["connected"])

    async def test_timeout_reveals_unsubmitted_as_missing(self):
        a, b, welcome_a, _ = await self.create_pair()
        room = ROOMS[welcome_a["code"]]
        room.duration = 0.05  # Keep the public 5–300s validation; accelerate this timer test internally.
        await send(a, type="start")
        await receive(a, "state")
        await receive(b, "state")
        revealed = await receive(a, "state")
        self.assertEqual(revealed["phase"], "reveal")
        self.assertEqual([entry["answer"] for entry in revealed["history"][0]["answers"]], [None, None])

    async def test_three_player_host_transfer_and_continued_game(self):
        a = await self.player()
        await send(a, type="create", name="甲", mode="word", capacity=3, duration=30)
        welcome_a = await receive(a, "welcome")
        await receive(a, "state")
        b = await self.player()
        await send(b, type="join", code=welcome_a["code"], name="乙")
        welcome_b = await receive(b, "welcome")
        await receive(b, "state")
        await receive(a, "state")
        c = await self.player()
        await send(c, type="join", code=welcome_a["code"], name="丙")
        await receive(c, "welcome")
        await receive(a, "state")
        await receive(b, "state")
        await receive(c, "state")
        await send(a, type="start")
        await receive(a, "state")
        await receive(b, "state")
        await receive(c, "state")
        await send(a, type="leave")
        transferred_b = await receive(b, "state")
        transferred_c = await receive(c, "state")
        self.assertEqual(transferred_b["hostId"], welcome_b["playerId"])
        self.assertEqual(transferred_c["capacity"], 2)
        await send(b, type="submit", answer="星星")
        await receive(b, "state")
        await receive(c, "state")
        await send(c, type="submit", answer="星星")
        finished = await receive(b, "state")
        self.assertEqual(finished["phase"], "finished")


if __name__ == "__main__":
    unittest.main()
