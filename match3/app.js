const SIZE = 8;
const TYPES = 6;
const SYMBOLS = ["◆", "◉", "▲", "★", "●", "✦"];
const boardEl = document.getElementById("board");
const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restart");
const localeSelect = document.getElementById("locale");
const tNodes = document.querySelectorAll("[data-i18n]");
const tAriaNodes = document.querySelectorAll("[data-i18n-aria]");
const boardAria = document.querySelector("#board");

const I18N = {
  en: {
    "title": "Match-3",
    "subtitle": "Tap a tile, then tap an adjacent tile to swap. Any line of 3 or more matching tiles is removed.",
    "locale-label": "Language",
    "score-label": "Score",
    "restart": "Restart",
    "hint": "Offline support enabled; install to launch from your home screen.",
    "status-no-match": "That swap does not create a match. Reverted.",
    "cell-label": "Tile",
    "board-label": "Game board",
    "aria-selected": "Selected",
    "loading": "Loading"
  },
  zh: {
    "title": "三消",
    "subtitle": "先点一个同色砖块，再点相邻砖块可交换。出现 3 个或以上连线将自动消除。",
    "locale-label": "语言",
    "score-label": "分数",
    "restart": "重开",
    "hint": "支持离线；安装后可直接从主屏启动。",
    "status-no-match": "这次交换不产生消除，已回退。",
    "cell-label": "格子",
    "board-label": "游戏棋盘",
    "aria-selected": "已选中",
    "loading": "加载中"
  },
  ms: {
    "title": "Match-3",
    "subtitle": "Ketik satu jubin, kemudian ketik jubin bersebelahan untuk bertukar. Sebarang barisan 3 atau lebih jubin yang sama akan hilang.",
    "locale-label": "Bahasa",
    "score-label": "Markah",
    "restart": "Mula Semula",
    "hint": "Sokongan luar talian diaktifkan; pasang aplikasi untuk lancar dari skrin utama.",
    "status-no-match": "Pertukaran itu tidak menghasilkan padanan. Dibatalkan.",
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

const board = new Array(SIZE * SIZE);
let selected = null;
let locked = false;
let score = 0;

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

function render() {
  boardEl.innerHTML = "";
  board.forEach((value, i) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = `tile type-${value}`;
    tile.dataset.index = String(i);
    tile.setAttribute("aria-label", `${t("cell-label")} ${i + 1}`);
    tile.textContent = SYMBOLS[value] || "⬤";
    tile.addEventListener("click", () => handleCellClick(i));
    boardEl.appendChild(tile);
  });

  if (selected !== null && boardEl.children[selected]) {
    boardEl.children[selected].setAttribute("aria-label", `${t("cell-label")} ${selected + 1} (${t("aria-selected")})`);
    boardEl.children[selected].classList.add("selected");
  }
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

  const tiles = [...boardEl.children];
  matches.forEach((i) => {
    if (tiles[i]) tiles[i].classList.add("removing");
  });

  return true;
}

function dropAndRefill() {
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
      board[index(r, c)] = randomType();
    }
  }
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
  let has = true;
  while (has) {
    const matches = findMatches();
    if (matches.length === 0) {
      has = false;
      break;
    }

    clearMatches();
    render();
    await flashRemoved(120);
    dropAndRefill();
    render();
    await flashRemoved(40);
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

  const a = selected;
  const b = i;
  selected = null;
  locked = true;
  await animateSwapTiles(a, b);
  swap(a, b);
  render();

  const matches = findMatches();
  if (matches.length === 0) {
    flashNoMatch(a);
    await animateSwapTiles(a, b);
    swap(a, b);
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
