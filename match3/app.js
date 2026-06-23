const SIZE = 8;
const TYPES = 6;
const boardEl = document.getElementById("board");
const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restart");

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
    tile.setAttribute("aria-label", `格子 ${i + 1}`);
    tile.textContent = "⬤";
    tile.addEventListener("click", () => handleCellClick(i));
    boardEl.appendChild(tile);
  });

  if (selected !== null && boardEl.children[selected]) {
    boardEl.children[selected].classList.add("selected");
  }
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
  swap(a, b);
  render();

  const matches = findMatches();
  if (matches.length === 0) {
    swap(a, b);
    render();
    statusEl.textContent = "这次交换不会形成消除，已回退。";
    await flashRemoved(500);
    statusEl.textContent = "";
    return;
  }

  statusEl.textContent = "";
  locked = true;
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

restartBtn.addEventListener("click", () => {
  restart();
});

fillBoardWithoutMatches();
render();
settleBoard();
