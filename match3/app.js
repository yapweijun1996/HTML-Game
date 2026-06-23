const SIZE = 8;
const TYPES = 6;
const SYMBOLS = ["◆", "◉", "▲", "★", "●", "✦"];
const boardEl = document.getElementById("board");
const scoreEl = document.getElementById("score");
const scoreBox = document.getElementById("score-box");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restart");
const localeSelect = document.getElementById("locale");
const tNodes = document.querySelectorAll("[data-i18n]");
const tAriaNodes = document.querySelectorAll("[data-i18n-aria]");
const boardAria = document.querySelector("#board");
const SWIPE_THRESHOLD = 18;

const I18N = {
  en: {
    "title": "Match-3",
    "subtitle": "Tap a tile, then tap an adjacent tile to swap. Keep chains alive for bigger multipliers.",
    "locale-label": "Language",
    "score-label": "Score",
    "restart": "New game",
    "hint": "Tip: install to home screen for instant play, even offline.",
    "status-no-match": "No chain formed. Try another move.",
    "cell-label": "Tile",
    "board-label": "Game board",
    "aria-selected": "Selected",
    "loading": "Loading"
  },
  zh: {
    "title": "三消",
    "subtitle": "点击一个方块，再点击相邻方块交换；持续连消可获得更高倍率。",
    "locale-label": "语言",
    "score-label": "分数",
    "restart": "重新开始",
    "hint": "小贴士：安装到主屏幕后可离线快速启动。",
    "status-no-match": "本次未形成连消，请再试一次。",
    "cell-label": "方块",
    "board-label": "游戏棋盘",
    "aria-selected": "已选中",
    "loading": "加载中"
  },
  ms: {
    "title": "Match-3",
    "subtitle": "Ketik satu jubin, kemudian ketik yang bersebelahan untuk menukar. Pertahankan rantaian untuk bonus berulang.",
    "locale-label": "Bahasa",
    "score-label": "Markah",
    "restart": "Main Baru",
    "hint": "Tip: pasang ke skrin utama untuk main terus, walaupun di luar talian.",
    "status-no-match": "Tiada rantaian dibuat. Cuba langkah lain.",
    "cell-label": "Jubin",
    "board-label": "Papan permainan",
    "aria-selected": "Dipilih",
    "loading": "Memuatkan"
  }
};

const SUPPORTED_LOCALES = Object.keys(I18N);

function getBrowserLocale() {
  const nav = (navigator.language || "en").toLowerCase();
  if (nav.startsWith("zh")) return "zh";
  if (nav.startsWith("ms") || nav.startsWith("id")) return "ms";
  return "en";
}

function resolveLocale() {
  const saved = localStorage.getItem("match3.locale");
  if (saved && SUPPORTED_LOCALES.includes(saved)) return saved;
  return getBrowserLocale();
}

function t(key) {
  return I18N[currentLocale][key] || I18N.en[key] || key;
}

let currentLocale = resolveLocale();

function applyLocaleText() {
  tNodes.forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (key) node.textContent = t(key);
  });

  tAriaNodes.forEach((node) => {
    const key = node.getAttribute("data-i18n-aria");
    if (key) node.setAttribute("aria-label", t(key));
  });

  if (boardAria) boardAria.setAttribute("aria-label", t("board-label"));

  localeSelect.value = currentLocale;
  document.documentElement.lang = currentLocale === "zh" ? "zh-CN" : currentLocale === "ms" ? "ms-MY" : "en";

  if (selected !== null && boardEl.children[selected]) {
    boardEl.children[selected].setAttribute("aria-label", `${t("cell-label")} ${selected + 1} (${t("aria-selected")})`);
  }
}

function setLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) locale = "en";
  currentLocale = locale;
  localStorage.setItem("match3.locale", locale);
  applyLocaleText();
  render();
}

function animateScorePop() {
  if (!scoreBox) return;
  scoreBox.classList.remove("score-pop");
  void scoreBox.offsetWidth;
  scoreBox.classList.add("score-pop");
}

const board = new Array(SIZE * SIZE);
let selected = null;
let locked = false;
let score = 0;
let pointerState = null;
let suppressNextClick = false;

function randomType() {
  return Math.floor(Math.random() * TYPES);
}

function index(row, col) {
  return row * SIZE + col;
}

function rowOf(i) {
  return Math.floor(i / SIZE);
}

function colOf(i) {
  return i % SIZE;
}

function getNeighbors(i) {
  const r = rowOf(i);
  const c = colOf(i);
  const out = [];
  if (r > 0) out.push(index(r - 1, c));
  if (r < SIZE - 1) out.push(index(r + 1, c));
  if (c > 0) out.push(index(r, c - 1));
  if (c < SIZE - 1) out.push(index(r, c + 1));
  return out;
}

function render(appearingIndexes = []) {
  boardEl.innerHTML = "";
  const appearing = new Set(appearingIndexes);
  const swapHints = selected !== null ? getSwappableMatchHints(selected) : [];
  const swapHintSet = new Set(swapHints);
  const neighborSet = selected !== null ? new Set(getNeighbors(selected)) : new Set();
  board.forEach((value, i) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = `tile type-${value}`;
    tile.dataset.index = String(i);
    tile.setAttribute("aria-label", `${t("cell-label")} ${i + 1}`);
    tile.textContent = SYMBOLS[value] || "⬤";
    if (appearing.has(i)) {
      tile.classList.add("appearing");
      tile.addEventListener("animationend", () => tile.classList.remove("appearing"), { once: true });
    }
    tile.addEventListener("click", () => {
      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }
      handleCellClick(i);
    });
    tile.addEventListener("pointerdown", (event) => handleTilePointerDown(i, event));
    tile.addEventListener("pointerup", (event) => handleTilePointerUp(i, event));
    tile.addEventListener("pointercancel", clearPointerState);
    boardEl.appendChild(tile);
  });

  if (selected !== null && boardEl.children[selected]) {
    boardEl.children[selected].setAttribute("aria-label", `${t("cell-label")} ${selected + 1} (${t("aria-selected")})`);
    boardEl.children[selected].classList.add("selected");

    for (const index of neighborSet) {
      const tile = boardEl.children[index];
      if (!tile) continue;
      tile.classList.add("swap-hint");
    }

    if (swapHintSet.size > 0) {
      for (const index of swapHintSet) {
        const tile = boardEl.children[index];
        if (!tile) continue;
        tile.classList.remove("swap-hint");
        tile.classList.add("match-hint");
      }
    }
  }
}

function getSwipeTarget(fromIndex, dx, dy) {
  const r = rowOf(fromIndex);
  const c = colOf(fromIndex);

  if (Math.abs(dx) < Math.abs(dy)) {
    if (dy > SWIPE_THRESHOLD && r < SIZE - 1) return index(r + 1, c);
    if (dy < -SWIPE_THRESHOLD && r > 0) return index(r - 1, c);
    return null;
  }

  if (dx > SWIPE_THRESHOLD && c < SIZE - 1) return index(r, c + 1);
  if (dx < -SWIPE_THRESHOLD && c > 0) return index(r, c - 1);
  return null;
}

function handleTilePointerDown(index, event) {
  if (locked || (event.button !== 0 && event.button !== -1)) return;
  event.preventDefault();

  pointerState = {
    pointerId: event.pointerId,
    index,
    x: event.clientX,
    y: event.clientY,
  };
  tileSetDragState(index, true);
}

function handleTilePointerUp(index, event) {
  if (!pointerState || event.pointerId !== pointerState.pointerId) {
    clearPointerState();
    return;
  }

  tileSetDragState(pointerState.index, false);

  const dx = event.clientX - pointerState.x;
  const dy = event.clientY - pointerState.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const target = getSwipeTarget(pointerState.index, dx, dy);

  if (distance > 6 && target !== null) {
    suppressNextClick = true;
    executeSwap(pointerState.index, target);
    clearPointerState();
    return;
  }

  if (pointerState.index === index) {
    suppressNextClick = true;
    handleCellClick(index);
  }

  clearPointerState();
}

function tileSetDragState(index, active) {
  const tile = boardEl.children[index];
  if (!tile) return;
  tile.classList.toggle("dragging", active);
}

function clearPointerState() {
  if (!pointerState) return;
  tileSetDragState(pointerState.index, false);
  pointerState = null;
}

function animateSwapTiles(a, b) {
  const aEl = boardEl.children[a];
  const bEl = boardEl.children[b];
  if (!aEl || !bEl) return Promise.resolve();

  const aRect = aEl.getBoundingClientRect();
  const bRect = bEl.getBoundingClientRect();
  const dx = bRect.left - aRect.left;
  const dy = bRect.top - aRect.top;

  const end = new Promise((resolve) => {
    let done = false;
    const onTransitionEnd = (event) => {
      if (event.target !== aEl && event.target !== bEl) return;
      if (event.propertyName !== "transform") return;
      if (done) return;
      done = true;
      cleanup();
      resolve();
    };

    const cleanup = () => {
      aEl.classList.remove("swapping");
      bEl.classList.remove("swapping");
      aEl.style.transform = "";
      bEl.style.transform = "";
      aEl.removeEventListener("transitionend", onTransitionEnd);
      bEl.removeEventListener("transitionend", onTransitionEnd);
    };

    aEl.classList.add("swapping");
    bEl.classList.add("swapping");
    aEl.style.transform = `translate(${dx}px, ${dy}px)`;
    bEl.style.transform = `translate(${-dx}px, ${-dy}px)`;

    requestAnimationFrame(() => {
      aEl.style.transform = "";
      bEl.style.transform = "";
    });

    aEl.addEventListener("transitionend", onTransitionEnd);
    bEl.addEventListener("transitionend", onTransitionEnd);
    setTimeout(() => {
      if (!done) {
        done = true;
        cleanup();
        resolve();
      }
    }, 240);
  });

  return end;
}

function flashNoMatch(index) {
  const tile = boardEl.children[index];
  if (!tile) return;
  tile.classList.add("shake");
  tile.addEventListener("animationend", () => tile.classList.remove("shake"), { once: true });
}

function flashInvalidSwap(from, to) {
  const a = boardEl.children[from];
  const b = boardEl.children[to];
  if (a) {
    a.classList.add("invalid-swap");
    a.addEventListener(
      "animationend",
      () => a.classList.remove("invalid-swap"),
      { once: true }
    );
  }
  if (b) {
    b.classList.add("invalid-swap");
    b.addEventListener(
      "animationend",
      () => b.classList.remove("invalid-swap"),
      { once: true }
    );
  }
}

function getSwappableMatchHints(index) {
  const neighbors = getNeighbors(index);
  const matchHints = [];

  for (const next of neighbors) {
    swap(index, next);
    if (findMatches().length > 0) {
      matchHints.push(next);
    }
    swap(index, next);
  }

  return matchHints;
}

async function executeSwap(from, to) {
  if (locked || !canSwap(from, to)) return;

  selected = null;
  locked = true;
  await animateSwapTiles(from, to);
  swap(from, to);
  render();

  const matches = findMatches();
  if (matches.length === 0) {
    flashNoMatch(from);
    flashInvalidSwap(from, to);
    await animateSwapTiles(from, to);
    swap(from, to);
    render();
    statusEl.textContent = t("status-no-match");
    await flashRemoved(500);
    statusEl.textContent = "";
    locked = false;
    return;
  }

  statusEl.textContent = "";
  await settleBoard();
  locked = false;
}

function hasMatchAt(i) {
  const value = board[i];
  if (value === null) return false;

  const r = rowOf(i);
  const c = colOf(i);

  let count = 1;
  for (let col = c - 1; col >= 0; col--) {
    if (board[index(r, col)] === value) count++;
    else break;
  }
  for (let col = c + 1; col < SIZE; col++) {
    if (board[index(r, col)] === value) count++;
    else break;
  }
  if (count >= 3) return true;

  count = 1;
  for (let row = r - 1; row >= 0; row--) {
    if (board[index(row, c)] === value) count++;
    else break;
  }
  for (let row = r + 1; row < SIZE; row++) {
    if (board[index(row, c)] === value) count++;
    else break;
  }
  return count >= 3;
}

function findMatches() {
  const matches = new Set();

  for (let r = 0; r < SIZE; r++) {
    let start = 0;
    while (start < SIZE) {
      let end = start + 1;
      while (end < SIZE && board[index(r, end)] === board[index(r, start)]) end++;
      if (end - start >= 3) {
        for (let c = start; c < end; c++) matches.add(index(r, c));
      }
      start = end;
    }
  }

  for (let c = 0; c < SIZE; c++) {
    let start = 0;
    while (start < SIZE) {
      let end = start + 1;
      while (end < SIZE && board[index(end, c)] === board[index(start, c)]) end++;
      if (end - start >= 3) {
        for (let r = start; r < end; r++) matches.add(index(r, c));
      }
      start = end;
    }
  }

  return [...matches];
}

function clearMatches() {
  const matches = findMatches();
  if (matches.length === 0) return false;

  matches.forEach((i) => {
    board[i] = null;
  });

  score += matches.length * 10;
  scoreEl.textContent = String(score);
  animateScorePop();

  const tiles = [...boardEl.children];
  matches.forEach((i) => {
    if (tiles[i]) tiles[i].classList.add("removing");
  });

  return true;
}

function dropAndRefill() {
  const appearing = [];
  for (let c = 0; c < SIZE; c++) {
    let write = SIZE - 1;
    for (let r = SIZE - 1; r >= 0; r--) {
      const i = index(r, c);
      if (board[i] !== null) {
        const target = index(write, c);
        board[target] = board[i];
        if (target !== i) board[i] = null;
        write--;
      }
    }
    for (let r = write; r >= 0; r--) {
      const idx = index(r, c);
      board[idx] = randomType();
      appearing.push(idx);
    }
  }

  return [...new Set(appearing)];
}

function swap(i, j) {
  const temp = board[i];
  board[i] = board[j];
  board[j] = temp;
}

function canSwap(i, j) {
  return getNeighbors(i).includes(j);
}

function hasInitialMatch() {
  return findMatches().length > 0;
}

function fillBoardWithoutMatches() {
  for (let i = 0; i < board.length; i++) {
    board[i] = randomType();
  }
  while (hasInitialMatch()) {
    for (let i = 0; i < board.length; i++) {
      if (hasMatchAt(i)) board[i] = randomType();
    }
  }
}

function flashRemoved(ms = 120) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function settleBoard() {
  while (true) {
    const matches = findMatches();
    if (matches.length === 0) break;

    clearMatches();
    render();
    await flashRemoved(120);
    const appearing = dropAndRefill();
    render(appearing);
    await flashRemoved(90);
  }
}

async function handleCellClick(i) {
  if (locked) return;

  if (selected === null) {
    selected = i;
    render();
    return;
  }

  if (selected === i) {
    selected = null;
    render();
    return;
  }

  if (!canSwap(selected, i)) {
    selected = i;
    render();
    return;
  }

  await executeSwap(selected, i);
}

function restart() {
  score = 0;
  statusEl.textContent = "";
  scoreEl.textContent = "0";
  selected = null;
  fillBoardWithoutMatches();
  render();
}

localeSelect.addEventListener("change", (event) => {
  setLocale(event.target.value);
});

restartBtn.addEventListener("click", () => {
  restart();
});

fillBoardWithoutMatches();
render();
setLocale(currentLocale);
settleBoard();
