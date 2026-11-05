"use strict";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[ch]);

const translations = {
  zh: {
    eyebrow:"和朋友的脑回路碰个面", title:"你的脑回路，<br><em>恰好我也有。</em>", wordDesc:"一个词，一点联想，一次不约而同。<br>2–4 人在线 · 想到一起为止", quizDesc:"同一道题，三个选项，测测你们的默契同步率。<br>2–4 人在线 · 双语默契题",
    createRoom:"⌂ &nbsp;创建房间", joinRoom:"➜ &nbsp;加入房间", mode:"游戏玩法", word:"同词联想", quiz:"默契问答", wordCaption:"自由联想猜同词", quizCaption:"三选一默契考验", name:"怎么称呼你？", people:"房间人数", fullStart:"满员后开始", thinking:"每轮思考时间", seconds:"秒", custom:"自定义", customHint:"秒（5–300）", createMine:"创建我的房间", createHint:"创建后邀请朋友，一起揭晓答案。", codeInput:"输入房间号", join:"加入房间", footer:"让脑回路相遇，让朋友更靠近。", questions:"题目数量", category:"题目分类", all:"全部分类", daily:"生活日常", imagination:"脑洞想象", personality:"性格偏好",
    room:"房间", waiting:"等待朋友加入", ready:"人员已齐，准备开始", waitingHint:"分享房间号或邀请链接，等朋友加入。", readyHint:"房主点击开始后，所有人同步进入游戏。", copy:"复制房间号", invite:"复制邀请链接", begin:"开始第 1 轮", needPlayers:"还差 {n} 人即可开始", leave:"退出房间", you:"我", host:"房主", joined:"已就绪", empty:"待加入", offline:"暂时离线", time:"每轮 {n} 秒", waitHost:"等待房主开始", round:"第 {n} 轮", quizRound:"第 {n} / {total} 题", firstHint:"先各想一个词，再一起揭晓", laterHint:"根据上一轮的词语，自由联想", quizHint:"同一道题，看看你们会不会选到一起", yourWord:"写下你脑中的那个词", lastWords:"上一轮的词 · 从这里继续联想", lock:"✓ 锁定答案", locked:"✓ 已锁定答案", hiddenHint:"提交后不能修改，其他玩家在揭晓前看不到。", submitted:"{n} / {total} 人已提交", composing:"正在作答…", submittedLabel:"已提交 ✓", waitingAnswer:"等待作答", noAnswer:"未作答", timeLeft:"剩余时间", reveal:"揭晓", almost:"还差一点", nextHint:"从这些词之间，寻找下一步", matched:"同词相遇！", matchedHint:"你们想到了同一个词", same:"选到一起啦", different:"这次选择不同", next:"继续下一轮", waitNext:"等待房主继续", footprint:"展开联想足迹 · {n} 轮", again:"再来一局", waitAgain:"等待房主再来一局", home:"返回首页", resultTitle:"你们的脑回路相遇了", resultLine:"用了 {n} 轮，我们都想到了「{word}」", scoreTitle:"默契同步率", scoreLine:"完成 {n} 题，看看你们的选择有多合拍。", connection:"连接中断，正在重连…", copyDone:"已复制到剪贴板", copyFail:"复制失败，请手动复制房间号", enterWord:"请输入一个词", selectOption:"请选择一个选项", roomNotReady:"房间尚未就绪", question:"题目", of:"共 {n} 轮"
  },
  en: {
    eyebrow:"Meet your friends on the same wavelength", title:"Your train of thought,<br><em>matches mine.</em>", wordDesc:"One word, a spark of association, a shared mind meld.<br>2–4 players · Until you say the same word", quizDesc:"One question, three choices. How in sync are you?<br>2–4 players · Bilingual questions",
    createRoom:"⌂ &nbsp;Create Room", joinRoom:"➜ &nbsp;Join Room", mode:"Game mode", word:"Same Word", quiz:"Quiz Choices", wordCaption:"Free word association", quizCaption:"Three-choice quiz", name:"What should we call you?", people:"Players", fullStart:"Starts when full", thinking:"Thinking time per round", seconds:"s", custom:"Custom", customHint:"seconds (5–300)", createMine:"Create My Room", createHint:"Invite friends and reveal answers together.", codeInput:"Room code", join:"Join Room", footer:"Connect wavelengths, bring friends closer.", questions:"Questions", category:"Category", all:"All categories", daily:"Daily Life", imagination:"Imagination", personality:"Personality",
    room:"Room", waiting:"Waiting for friends", ready:"Everyone is here", waitingHint:"Share the room code or invite link with your friends.", readyHint:"The host starts the game when everyone is here.", copy:"Copy room code", invite:"Copy invite link", begin:"Start Round 1", needPlayers:"Waiting for {n} more player(s)", leave:"Leave room", you:"Me", host:"Host", joined:"Ready", empty:"Open seat", offline:"Disconnected", time:"{n}s per round", waitHost:"Waiting for host", round:"Round {n}", quizRound:"Question {n} / {total}", firstHint:"Think of a word, then reveal together", laterHint:"Associate from the previous words", quizHint:"Will you choose the same answer?", yourWord:"Write the word on your mind", lastWords:"Previous words · Start from here", lock:"✓ Lock Answer", locked:"✓ Answer Locked", hiddenHint:"Answers cannot be changed. Others cannot see yours before reveal.", submitted:"{n} / {total} submitted", composing:"Choosing…", submittedLabel:"Submitted ✓", waitingAnswer:"Waiting", noAnswer:"No answer", timeLeft:"Time left", reveal:"Reveal", almost:"Not quite yet", nextHint:"Find the next word between these ideas", matched:"Same word!", matchedHint:"Your minds met on one word", same:"You chose alike", different:"Different choices", next:"Next Round", waitNext:"Waiting for host", footprint:"Show word trail · {n} rounds", again:"Play Again", waitAgain:"Waiting for host to replay", home:"Back to Home", resultTitle:"Your minds met", resultLine:"After {n} rounds, everyone said “{word}”.", scoreTitle:"Wavelength Sync", scoreLine:"You finished {n} questions. See how often your choices aligned.", connection:"Connection lost. Reconnecting…", copyDone:"Copied to clipboard", copyFail:"Could not copy. Please copy the room code manually.", enterWord:"Enter a word", selectOption:"Select an option", roomNotReady:"The room is not ready yet", question:"Question", of:"{n} rounds"
  }
};

let locale = localStorage.getItem("sameword_language") === "en" ? "en" : "zh";
let homeTab = "create";
let mode = "word";
let capacity = 2;
let duration = "30";
let questionCount = 10;
let socket = null;
let state = null;
let currentCode = null;
let draft = "";
let selectedOption = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
let manualClose = false;
let toastTimer = null;
let currentIntent = null;

function tr(key, vars = {}) {
  let text = translations[locale][key] ?? key;
  for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
  return text;
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 3300);
}

function selectGroup(attribute, value) {
  $$(`[${attribute}]`).forEach((button) => button.classList.toggle("selected", button.dataset[attribute.replace("data-", "").replace(/-([a-z])/g, (_, c) => c.toUpperCase())] === String(value)));
}

function setHomeTab(next) {
  homeTab = next;
  $("#create-form").classList.toggle("hidden", next !== "create");
  $("#join-form").classList.toggle("hidden", next !== "join");
  for (const [name, selector] of [["create", "#create-tab"], ["join", "#join-tab"]]) {
    const button = $(selector);
    button.classList.toggle("active", name === next);
    button.setAttribute("aria-selected", String(name === next));
  }
}

function refreshHome() {
  document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  $("#language-select").value = locale;
  $("#hero-eyebrow").textContent = tr("eyebrow");
  $("#hero-title").innerHTML = tr("title");
  $("#hero-description").innerHTML = tr(mode === "quiz" ? "quizDesc" : "wordDesc");
  const mappings = {
    "#create-tab":"createRoom","#join-tab":"joinRoom","#mode-label":"mode","#mode-caption":mode === "quiz" ? "quizCaption" : "wordCaption","#name-label":"name","#count-label":"people","#count-caption":"fullStart","#time-label":"thinking","#seconds-label":"customHint","#questions-label":"questions","#category-label":"category","#create-submit":"createMine","#create-hint":"createHint","#room-code-label":"codeInput","#join-name-label":"name","#join-submit":"join","#home-footer":"footer"
  };
  for (const [selector, key] of Object.entries(mappings)) $(selector).innerHTML = tr(key);
  $("[data-mode='word']").textContent = tr("word");
  $("[data-mode='quiz']").textContent = tr("quiz");
  $$('[data-capacity]').forEach((el) => el.textContent = `${el.dataset.capacity} ${locale === "zh" ? "人" : "Players"}`);
  $$('[data-duration]').forEach((el) => el.textContent = el.dataset.duration === "custom" ? tr("custom") : `${el.dataset.duration} ${tr("seconds")}`);
  $$('[data-questions]').forEach((el) => el.textContent = `${el.dataset.questions} ${locale === "zh" ? "题" : "Questions"}`);
  $$("#quiz-category option").forEach((el) => el.textContent = tr(el.value));
  $("#quiz-settings").classList.toggle("hidden", mode !== "quiz");
  $("#custom-time-wrap").classList.toggle("hidden", duration !== "custom");
  $("#create-name").placeholder = locale === "zh" ? "柠檬可乐" : "Lemon Cola";
  $("#join-name").placeholder = $("#create-name").placeholder;
  $("#room-code").placeholder = locale === "zh" ? "6 位房间号" : "6-character code";
  selectGroup("data-mode", mode);
  selectGroup("data-capacity", capacity);
  selectGroup("data-duration", duration);
  selectGroup("data-questions", questionCount);
}

function showScreen(room) {
  $("#home-screen").classList.toggle("hidden", room);
  $("#room-screen").classList.toggle("hidden", !room);
  $("#room-pill").classList.toggle("hidden", !room);
  if (room) $("#room-pill").textContent = `${tr("room")} ${currentCode || ""}`;
}

function setConnectionBanner(visible) {
  $("#connection-banner").classList.toggle("hidden", !visible);
  $("#connection-banner").textContent = tr("connection");
}

function rememberName(name) {
  localStorage.setItem("sameword_name", name);
  $("#create-name").value = name;
  $("#join-name").value = name;
}

function tokenKey(code) { return `sameword_token_${code}`; }

function connect(payload, reconnecting = false) {
  clearTimeout(reconnectTimer);
  if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
  manualClose = false;
  currentIntent = payload;
  if (!reconnecting) {
    state = null;
    draft = "";
    selectedOption = null;
    currentCode = payload.type === "join" ? payload.code : null;
  }
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${protocol}//${location.host}/ws`);
  let welcomed = false;
  socket = ws;
  if (reconnecting) setConnectionBanner(true);
  ws.onopen = () => { if (socket === ws) ws.send(JSON.stringify(payload)); };
  ws.onmessage = (event) => {
    if (socket !== ws) return;
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    if (message.type === "error") {
      toast(message.message);
      if (!welcomed) {
        manualClose = true;
        ws.close();
        if (reconnecting && currentCode) {
          sessionStorage.removeItem(tokenKey(currentCode));
          history.replaceState(null, "", "/");
          state = null;
          currentCode = null;
        }
        showScreen(false);
        setConnectionBanner(false);
      }
    } else if (message.type === "welcome") {
      welcomed = true;
      currentCode = message.code;
      sessionStorage.setItem(tokenKey(currentCode), message.token);
      history.replaceState(null, "", `/?r=${encodeURIComponent(currentCode)}`);
      showScreen(true);
      setConnectionBanner(false);
      reconnectAttempts = 0;
    } else if (message.type === "state") {
      if (state && message.code === state.code && message.version < state.version) return;
      if (state && message.round !== state.round) { draft = ""; selectedOption = null; }
      state = message;
      currentCode = message.code;
      setConnectionBanner(false);
      renderRoom();
    }
  };
  ws.onclose = () => {
    if (socket !== ws || manualClose) return;
    if (!currentCode || !sessionStorage.getItem(tokenKey(currentCode))) {
      toast(locale === "zh" ? "无法连接服务器" : "Could not connect to the server");
      showScreen(false);
      return;
    }
    setConnectionBanner(true);
    reconnectAttempts++;
    reconnectTimer = setTimeout(() => connect({type:"join", code:currentCode, name:localStorage.getItem("sameword_name") || "Player", token:sessionStorage.getItem(tokenKey(currentCode))}, true), Math.min(3000, 500 * reconnectAttempts));
  };
}

function send(type, extra = {}) {
  if (!socket || socket.readyState !== WebSocket.OPEN) { toast(tr("connection")); return; }
  socket.send(JSON.stringify({type, ...extra}));
}

function leaveRoom() {
  manualClose = true;
  clearTimeout(reconnectTimer);
  if (socket && socket.readyState === WebSocket.OPEN) send("leave");
  if (socket) socket.close();
  if (currentCode) sessionStorage.removeItem(tokenKey(currentCode));
  socket = null;
  state = null;
  currentCode = null;
  draft = "";
  selectedOption = null;
  history.replaceState(null, "", "/");
  showScreen(false);
  refreshHome();
}

function isHost() { return state && state.selfId === state.hostId; }
function answerLabel(answer, question) {
  if (answer === null || answer === undefined) return tr("noAnswer");
  return question ? `${"ABC"[answer]}. ${locale === "zh" ? question.optionsZh[answer] : question.optionsEn[answer]}` : String(answer);
}
function playerName(player) { return `${escapeHtml(player.name)}${player.id === state.selfId ? ` · ${tr("you")}` : ""}`; }

function playerRows() {
  let html = `<div class="player-list">`;
  for (let i = 0; i < state.capacity; i++) {
    const player = state.players[i];
    const detail = !player ? tr("empty") : !player.connected ? tr("offline") : state.phase === "lobby" ? (player.isHost ? tr("host") : tr("joined")) : player.submitted ? tr("submittedLabel") : player.id === state.selfId ? tr("composing") : tr("waitingAnswer");
    html += `<div class="player-row"><span class="player-index">${i + 1}</span><span class="player-name">${player ? playerName(player) : tr("empty")}</span><span class="player-detail ${player?.submitted ? "ready" : player && !player.connected ? "disconnected" : ""}">${escapeHtml(detail)}</span></div>`;
  }
  return html + `</div>`;
}

function card(header, body, right = "") {
  return `<article class="game-card"><div class="card-header"><strong>${header}</strong><span>${right}</span></div><div class="card-body">${body}</div></article>`;
}

function renderLobby() {
  const missing = state.capacity - state.players.length;
  const ready = missing === 0 && state.players.every((p) => p.connected);
  const title = ready ? tr("ready") : tr("waiting");
  const hint = ready ? tr("readyHint") : tr("waitingHint");
  const content = `<h2 class="card-title">${title}</h2><p class="card-subtitle">${hint}</p>
    <div class="room-code-display">${escapeHtml(state.code)} <button type="button" data-action="copy-code" aria-label="${tr("copy")}">⧉</button></div>
    <div class="room-meta"><span class="meta-chip">${state.players.length} / ${state.capacity} ${locale === "zh" ? "人" : "players"}</span><span class="meta-chip">⏱ ${tr("time",{n:state.duration})}</span><span class="meta-chip">${tr(state.mode)}</span></div>
    <p class="section-note">${ready ? tr("ready") : tr("needPlayers", {n:missing})}</p>${playerRows()}
    <div class="button-row"><button type="button" class="secondary-button" data-action="copy-invite">${tr("invite")}</button></div>
    ${isHost() ? `<button type="button" class="primary-button full-width" data-action="start" ${ready ? "" : "disabled"}>${tr("begin")}</button>` : `<p class="form-hint">${tr("waitHost")}</p>`}
    <p class="center"><button type="button" class="text-button" data-action="leave">${tr("leave")}</button></p>`;
  return card(`${tr("room")} ${escapeHtml(state.code)}`, content, tr(state.mode));
}

function renderPrevious() {
  if (state.mode !== "word" || !state.history.length) return "";
  const previous = state.history[state.history.length - 1];
  return `<div class="previous-panel"><div class="previous-title">${tr("lastWords")}</div><div class="previous-words">${previous.answers.map((item) => `<span>${escapeHtml(item.name)}: <strong>${escapeHtml(answerLabel(item.answer))}</strong></span>`).join("")}</div></div>`;
}

function renderWriting() {
  const submitted = state.ownAnswer !== null && state.ownAnswer !== undefined;
  const total = state.players.length;
  const count = state.players.filter((p) => p.submitted).length;
  const label = state.mode === "quiz" ? tr("quizRound", {n:state.round,total:state.questionCount}) : tr("round",{n:state.round});
  const hint = state.mode === "quiz" ? tr("quizHint") : state.round === 1 ? tr("firstHint") : tr("laterHint");
  let answerArea;
  if (state.mode === "word") {
    answerArea = `${renderPrevious()}<label class="answer-label" for="word-answer">${tr("yourWord")}</label><input class="answer-input" id="word-answer" maxlength="24" autocomplete="off" spellcheck="false" placeholder="${locale === "zh" ? "输入一个词…" : "Enter one word…"}" value="${escapeHtml(submitted ? state.ownAnswer : draft)}" ${submitted ? "disabled" : ""}>`;
  } else {
    const question = state.question;
    const options = locale === "zh" ? question.optionsZh : question.optionsEn;
    const active = submitted ? state.ownAnswer : selectedOption;
    answerArea = `<h2 class="card-title" style="font-size:21px;margin:4px 0 20px">${escapeHtml(locale === "zh" ? question.zh : question.en)}</h2><div class="option-list">${options.map((option, index) => `<button type="button" class="option-card ${active === index ? "selected" : ""}" data-option="${index}" ${submitted ? "disabled" : ""}><span class="option-letter">${"ABC"[index]}</span><span>${escapeHtml(option)}</span></button>`).join("")}</div>`;
  }
  const content = `<div class="timer-line"><span>${escapeHtml(hint)}</span><span class="timer" id="timer">—</span></div>${answerArea}
    <p class="answer-helper">${tr("hiddenHint")}</p><button type="button" class="primary-button full-width" data-action="submit" ${submitted ? "disabled" : ""}>${submitted ? tr("locked") : tr("lock")}</button>
    <div class="room-meta"><span class="meta-chip">${tr("submitted",{n:count,total})}</span></div>${playerRows()}`;
  return card(escapeHtml(label), content, `⏱ ${state.duration}s`);
}

function historyMarkup() {
  return `<details class="history-details"><summary>${tr("footprint",{n:state.history.length})}</summary><div class="history-list">${state.history.map((item) => `<div class="history-item"><strong>${tr("round",{n:item.round})}</strong><div class="history-answer">${item.answers.map((entry) => `<span>${escapeHtml(entry.name)}: ${escapeHtml(answerLabel(entry.answer,item.question))}</span>`).join("")}</div></div>`).join("")}</div></details>`;
}

function renderReveal() {
  const result = state.history.at(-1);
  const cards = result.answers.map((entry) => `<div class="word-card"><small>${escapeHtml(entry.name)}${entry.playerId === state.selfId ? ` · ${tr("you")}` : ""}</small><strong>${escapeHtml(answerLabel(entry.answer,result.question))}</strong></div>`).join("");
  const title = state.mode === "word" ? tr("almost") : result.matched ? tr("same") : tr("different");
  const question = result.question ? `<p class="section-note">${escapeHtml(locale === "zh" ? result.question.zh : result.question.en)}</p>` : `<p class="section-note">${tr("nextHint")}</p>`;
  const button = isHost() ? `<button type="button" class="primary-button full-width" data-action="next">${tr("next")}</button>` : `<button type="button" class="primary-button full-width" disabled>${tr("waitNext")}</button>`;
  return card(`${tr("round",{n:state.round})} · ${tr("reveal")}`, `${question}<div class="word-pair">${cards}</div>${button}${historyMarkup()}`, title);
}

function timeline() {
  return `<div class="result-timeline">${state.history.map((item) => `<div class="result-round"><div class="result-round-label">${state.mode === "quiz" ? tr("quizRound",{n:item.round,total:state.questionCount}) : tr("round",{n:item.round})}${item.question ? ` · ${escapeHtml(locale === "zh" ? item.question.zh : item.question.en)}` : ""}</div><div class="result-answer-grid">${item.answers.map((entry) => `<div class="result-answer"><small>${escapeHtml(entry.name)}</small>${escapeHtml(answerLabel(entry.answer,item.question))}</div>`).join("")}</div><div class="result-symbol ${item.matched ? "yes" : ""}">${item.matched ? "✓" : "×"}</div></div>`).join("")}</div>`;
}

function renderFinished() {
  let intro;
  if (state.mode === "word") {
    const word = state.history.at(-1).answers[0].answer;
    intro = `<h2 class="card-title">${tr("resultTitle")}</h2><p class="card-subtitle">${escapeHtml(tr("resultLine",{n:state.history.length,word}))}</p>`;
  } else {
    intro = `<h2 class="card-title">${tr("scoreTitle")}</h2><div class="score-number">${state.score}%</div><p class="score-caption">${tr("scoreLine",{n:state.history.length})}</p>`;
  }
  const replay = isHost() ? `<button type="button" class="primary-button full-width" data-action="restart">${tr("again")}</button>` : `<button type="button" class="primary-button full-width" disabled>${tr("waitAgain")}</button>`;
  return card(tr(state.mode), `${intro}${timeline()}${replay}<p class="center"><button type="button" class="text-button" data-action="leave">${tr("home")}</button></p>`, `${tr("room")} ${escapeHtml(state.code)} · ${tr("of",{n:state.history.length})}`);
}

function updateTimer() {
  const element = $("#timer");
  if (!element || !state || state.phase !== "writing") return;
  const seconds = Math.max(0, Math.ceil((state.deadline * 1000 - Date.now()) / 1000));
  element.textContent = `${seconds} s`;
  element.classList.toggle("urgent", seconds <= 10);
}

function renderRoom() {
  if (!state) return;
  showScreen(true);
  const hadWordFocus = document.activeElement?.id === "word-answer";
  const caret = hadWordFocus ? document.activeElement.selectionStart : null;
  let html;
  if (state.phase === "lobby") html = renderLobby();
  else if (state.phase === "writing") html = renderWriting();
  else if (state.phase === "reveal") html = renderReveal();
  else html = renderFinished();
  $("#room-content").innerHTML = html;
  if (hadWordFocus && $("#word-answer") && !$("#word-answer").disabled) {
    $("#word-answer").focus();
    $("#word-answer").setSelectionRange(caret, caret);
  }
  updateTimer();
}

async function copyText(value) {
  try { await navigator.clipboard.writeText(value); toast(tr("copyDone")); }
  catch { toast(tr("copyFail")); }
}

document.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-home-tab]");
  if (tab) { setHomeTab(tab.dataset.homeTab); return; }
  const modeButton = event.target.closest("[data-mode]");
  if (modeButton) { mode = modeButton.dataset.mode; refreshHome(); return; }
  const capacityButton = event.target.closest("[data-capacity]");
  if (capacityButton) { capacity = Number(capacityButton.dataset.capacity); refreshHome(); return; }
  const durationButton = event.target.closest("[data-duration]");
  if (durationButton) { duration = durationButton.dataset.duration; refreshHome(); return; }
  const countButton = event.target.closest("[data-questions]");
  if (countButton) { questionCount = Number(countButton.dataset.questions); refreshHome(); return; }
  const optionButton = event.target.closest("[data-option]");
  if (optionButton && state?.phase === "writing" && state.ownAnswer == null) {
    selectedOption = Number(optionButton.dataset.option);
    $$("[data-option]").forEach((el) => el.classList.toggle("selected", Number(el.dataset.option) === selectedOption));
    return;
  }
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  const action = actionButton.dataset.action;
  if (action === "leave") leaveRoom();
  else if (action === "copy-code") copyText(state.code);
  else if (action === "copy-invite") copyText(`${location.origin}/?r=${encodeURIComponent(state.code)}`);
  else if (["start", "next", "restart"].includes(action)) send(action);
  else if (action === "submit") {
    if (state.mode === "word") {
      const answer = $("#word-answer")?.value.trim();
      if (!answer) { toast(tr("enterWord")); return; }
      send("submit", {answer});
    } else {
      if (selectedOption === null) { toast(tr("selectOption")); return; }
      send("submit", {answer:selectedOption});
    }
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "word-answer") draft = event.target.value;
  if (event.target.id === "room-code") event.target.value = event.target.value.toUpperCase();
});

$("#create-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = $("#create-name").value.trim();
  const seconds = duration === "custom" ? Number($("#custom-time").value) : Number(duration);
  if (!Number.isInteger(seconds) || seconds < 5 || seconds > 300) { toast(locale === "zh" ? "时间需为 5–300 秒" : "Time must be 5–300 seconds"); return; }
  rememberName(name);
  connect({type:"create",name,mode,capacity,duration:seconds,questionCount,category:$("#quiz-category").value});
});

$("#join-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const code = $("#room-code").value.trim().toUpperCase();
  const name = $("#join-name").value.trim();
  rememberName(name);
  connect({type:"join",code,name,token:sessionStorage.getItem(tokenKey(code))});
});

$("#language-select").addEventListener("change", (event) => {
  locale = event.target.value;
  localStorage.setItem("sameword_language", locale);
  refreshHome();
  renderRoom();
});

$("#brand-link").addEventListener("click", (event) => {
  event.preventDefault();
  if (state) leaveRoom();
  else { history.replaceState(null, "", "/"); setHomeTab("create"); }
});

setInterval(updateTimer, 500);
const savedName = localStorage.getItem("sameword_name") || "";
if (savedName) rememberName(savedName);
refreshHome();
const inviteCode = new URLSearchParams(location.search).get("r")?.trim().toUpperCase();
if (inviteCode) {
  $("#room-code").value = inviteCode;
  setHomeTab("join");
  const token = sessionStorage.getItem(tokenKey(inviteCode));
  if (token) connect({type:"join",code:inviteCode,name:savedName || "Player",token}, true);
}
