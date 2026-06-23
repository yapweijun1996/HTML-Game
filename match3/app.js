/* Game logic moved into modular structure */

const {
  gameState,
  gameProgress,
  tutorialState,
  achievementState,
  state: uiState,
  saveStateJson,
  getLevelConfig,
} = Match3Store;

const {
  boardEl,
  statusEl,
  statusHintEl,
  goalMessageEl,
  levelEl,
  movesLeftEl,
  targetScoreEl,
  goalProgressEl,
  scoreBox,
  localeSelect,
  inputModeSelect,
  restartBtn,
  nextLevelBtn,
  mainMenuBtn,
  hintBtn,
  achievementList,
  tNodes,
  tAriaNodes,
  boardAria,
} = Match3UI;

let currentLocale = resolveLocale();

gameState.tutorial = {
  stage: Number(tutorialState.stage) || 1,
  completed: !!tutorialState.completed,
};
gameState.inputMode = localStorage.getItem(STORAGE_KEYS.inputMode) || "drag";
gameState.locale = currentLocale;
if (gameState.tutorial.stage < 1 || gameState.tutorial.stage > 2) {
  gameState.tutorial.stage = 1;
}

function getChainMultiplier(chainIndex) {
  return chainIndex >= 4 ? 4 : chainIndex;
}

function evaluateMatchScore(matches, chainIndex) {
  return matches * 10 * getChainMultiplier(chainIndex);
}

function isGoalReached() {
  return gameState.goalProgress >= gameState.targetScore;
}

function isOutOfMoves() {
  return gameState.movesLeft <= 0;
}

function setLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) locale = "en";
  currentLocale = locale;
  gameState.locale = locale;
  localStorage.setItem(STORAGE_KEYS.locale, locale);
  applyLocaleText();
  render();
}

function applyLocaleText() {
  tNodes.forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (!key) return;
    node.textContent = t(key);
  });

  tAriaNodes.forEach((node) => {
    const key = node.getAttribute("data-i18n-aria");
    if (!key) return;
    node.setAttribute("aria-label", t(key));
  });

  if (boardAria) {
    boardAria.setAttribute("aria-label", t("board-label"));
  }

  localeSelect.value = currentLocale;
  inputModeSelect.value = gameState.inputMode;
  inputModeSelect.querySelector("option[value='drag']").textContent = t("input-mode-drag");
  inputModeSelect.querySelector("option[value='tap']").textContent = t("input-mode-tap");

  if (uiState.selected !== null && boardEl.children[uiState.selected]) {
    boardEl.children[uiState.selected].setAttribute("aria-label", `${t("cell-label")} ${uiState.selected + 1} (${t("aria-selected")})`);
  }

  document.documentElement.lang = currentLocale === "zh" ? "zh-CN" : currentLocale === "ms" ? "ms-MY" : "en";
}

function setStatusLine(text, clearHint = false) {
  uiState.statusMessage = text || "";
  if (!clearHint) {
    statusEl.textContent = uiState.statusMessage;
  }
}

function setGoalText(text) {
  goalMessageEl.textContent = text || "";
}

function updateStatus() {
  if (gameState.levelResult === "won") {
    setGoalText(t("goal-success"));
    setStatusLine("");
    statusHintEl.textContent = t("next-level");
    return;
  }

  if (gameState.levelResult === "lost") {
    setGoalText(t("goal-fail"));
    setStatusLine(t("status-no-match"));
    return;
  }

  setGoalText("");
  if (!gameState.tutorial.completed) {
    if (gameState.tutorial.stage === 1) {
      statusHintEl.textContent = t("tutorial-step1");
    } else {
      statusHintEl.textContent = t("tutorial-step2");
    }
  } else {
    statusHintEl.textContent = `${t("moves-left")}: ${gameState.movesLeft} / ${t("target-score")}: ${gameState.targetScore}`;
  }

  if (uiState.statusMessage) {
    setStatusLine(uiState.statusMessage);
  } else {
    statusEl.textContent = "";
  }
}

function animateScorePop() {
  if (!scoreBox) return;
  scoreBox.classList.remove("score-pop");
  void scoreBox.offsetWidth;
  scoreBox.classList.add("score-pop");
}

function startTurn() {
  uiState.selected = null;
  uiState.activeHint = null;
  gameState.levelResult = "playing";
  uiState.statusMessage = "";
  gameState.locked = false;
}

function startLevel(level) {
  const config = getLevelConfig(level);
  gameState.level = Math.max(1, Math.floor(level) || 1);
  gameState.movesLeft = config.moves;
  gameState.targetScore = config.target;
  gameState.score = 0;
  gameState.typeCount = config.typeCount;
  gameState.goalProgress = 0;
  gameState.chainCount = 0;
  gameState.lastMoveChains = 0;
  gameState.lastMoveScore = 0;
  gameState.invalidMovesInLevel = 0;
  gameState.validMovesInLevel = 0;
  gameState.hintUsedThisLevel = false;
  gameState.levelResult = "playing";
  gameState.board = new Array(SIZE * SIZE).fill(0);
  gameState.inputMode = localStorage.getItem(STORAGE_KEYS.inputMode) || "drag";
  fillBoardWithoutMatches();
  gameState.tutorial = {
    stage: gameState.tutorial.stage || 1,
    completed: gameState.tutorial.completed,
  };

  startTurn();
  gameProgress.currentLevel = gameState.level;
  if (gameProgress.highestUnlockedLevel < gameState.level) {
    gameProgress.highestUnlockedLevel = gameState.level;
  }
  saveStateJson(STORAGE_KEYS.progress, gameProgress);
  setStatusLine("");
  render();
  updateStatus();
}

function saveTutorialState() {
  saveStateJson(STORAGE_KEYS.tutorial, gameState.tutorial);
}

function markTutorialAdvance() {
  if (gameState.tutorial.completed) return;
  if (gameState.tutorial.stage === 1) {
    gameState.tutorial.stage = 2;
  } else if (gameState.tutorial.stage === 2) {
    gameState.tutorial.completed = true;
  }
  saveTutorialState();
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

function randomType(typeCount = gameState.typeCount) {
  return Math.floor(Math.random() * typeCount);
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

function canSwap(i, j) {
  return getNeighbors(i).includes(j);
}

function canInteract() {
  return gameState.levelResult === "playing" && !gameState.locked;
}

function swapState(state, i, j) {
  const temp = state[i];
  state[i] = state[j];
  state[j] = temp;
}

function hasMatchAt(i, state) {
  const value = state[i];
  if (value === null) return false;

  const r = rowOf(i);
  const c = colOf(i);

  let count = 1;
  for (let col = c - 1; col >= 0; col--) {
    if (state[index(r, col)] === value) count++;
    else break;
  }
  for (let col = c + 1; col < SIZE; col++) {
    if (state[index(r, col)] === value) count++;
    else break;
  }
  if (count >= 3) return true;

  count = 1;
  for (let row = r - 1; row >= 0; row--) {
    if (state[index(row, c)] === value) count++;
    else break;
  }
  for (let row = r + 1; row < SIZE; row++) {
    if (state[index(row, c)] === value) count++;
    else break;
  }
  return count >= 3;
}

function findMatchesOnBoard(state) {
  const matches = new Set();

  for (let r = 0; r < SIZE; r++) {
    let start = 0;
    while (start < SIZE) {
      let end = start + 1;
      while (end < SIZE && state[index(r, end)] === state[index(r, start)]) end++;
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
      while (end < SIZE && state[index(end, c)] === state[index(start, c)]) end++;
      if (end - start >= 3) {
        for (let r = start; r < end; r++) matches.add(index(r, c));
      }
      start = end;
    }
  }

  return [...matches];
}

function findMatches() {
  return findMatchesOnBoard(gameState.board);
}

function hasMatches(state) {
  return findMatchesOnBoard(state).length > 0;
}

function fillBoardWithoutMatches() {
  for (let i = 0; i < gameState.board.length; i++) {
    gameState.board[i] = randomType();
  }

  let attempts = 0;
  while (hasMatches(gameState.board) && attempts < 150) {
    for (let i = 0; i < gameState.board.length; i++) {
      if (hasMatchAt(i, gameState.board)) {
        gameState.board[i] = randomType();
      }
    }
    attempts++;
  }
}

function flashRemoved(ms = 120) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function animateSwapTiles(from, to) {
  const fromEl = boardEl.children[from];
  const toEl = boardEl.children[to];
  if (!fromEl || !toEl) return Promise.resolve();

  const fromRect = fromEl.getBoundingClientRect();
  const toRect = toEl.getBoundingClientRect();
  const dx = toRect.left - fromRect.left;
  const dy = toRect.top - fromRect.top;

  const end = new Promise((resolve) => {
    let done = false;

    const onTransitionEnd = (event) => {
      if (event.target !== fromEl && event.target !== toEl) return;
      if (event.propertyName !== "transform") return;
      if (done) return;
      done = true;
      cleanup();
      resolve();
    };

    const cleanup = () => {
      fromEl.classList.remove("swapping");
      toEl.classList.remove("swapping");
      fromEl.style.transform = "";
      toEl.style.transform = "";
      fromEl.removeEventListener("transitionend", onTransitionEnd);
      toEl.removeEventListener("transitionend", onTransitionEnd);
    };

    fromEl.classList.add("swapping");
    toEl.classList.add("swapping");
    fromEl.style.transform = `translate(${dx}px, ${dy}px)`;
    toEl.style.transform = `translate(${-dx}px, ${-dy}px)`;
    requestAnimationFrame(() => {
      fromEl.style.transform = "";
      toEl.style.transform = "";
    });

    fromEl.addEventListener("transitionend", onTransitionEnd);
    toEl.addEventListener("transitionend", onTransitionEnd);
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

function flashNoMatch(i) {
  const tile = boardEl.children[i];
  if (!tile) return;
  tile.classList.add("shake");
  tile.addEventListener("animationend", () => tile.classList.remove("shake"), { once: true });
}

function flashInvalidSwap(from, to) {
  const a = boardEl.children[from];
  const b = boardEl.children[to];

  if (a) {
    a.classList.add("invalid-swap");
    a.addEventListener("animationend", () => a.classList.remove("invalid-swap"), { once: true });
  }
  if (b) {
    b.classList.add("invalid-swap");
    b.addEventListener("animationend", () => b.classList.remove("invalid-swap"), { once: true });
  }
}

function dropAndRefillState(state) {
  for (let c = 0; c < SIZE; c++) {
    let write = SIZE - 1;

    for (let r = SIZE - 1; r >= 0; r--) {
      const source = index(r, c);
      if (state[source] !== null) {
        const target = index(write, c);
        state[target] = state[source];
        if (target !== source) state[source] = null;
        write--;
      }
    }

    for (let r = write; r >= 0; r--) {
      state[index(r, c)] = randomType(gameState.typeCount);
    }
  }
}

function dropAndRefill() {
  const appearing = [];
  const falling = [];

  for (let c = 0; c < SIZE; c++) {
    const values = [];
    for (let r = 0; r < SIZE; r++) {
      const i = index(r, c);
      if (gameState.board[i] !== null) values.push({ row: r, value: gameState.board[i] });
    }

    let write = SIZE - 1;
    for (let i = values.length - 1; i >= 0; i--) {
      const info = values[i];
      const from = info.row;
      const to = write;
      const target = index(to, c);
      gameState.board[target] = info.value;
      if (target !== index(from, c)) {
        falling.push({
          fromIndex: index(from, c),
          toIndex: target,
          distance: to - from,
          delay: Math.min(FALL_MAX_DELAY, FALL_BASE_DELAY + (to - from) * FALL_DELAY_PER_STEP),
        });
      }
      write--;
    }

    const spawnDistance = write + 1;
    for (let r = write; r >= 0; r--) {
      gameState.board[index(r, c)] = randomType();
      appearing.push(index(r, c));
      falling.push({
        fromIndex: index(r - spawnDistance, c),
        toIndex: index(r, c),
        distance: spawnDistance,
        delay: Math.min(FALL_MAX_DELAY, FALL_BASE_DELAY + spawnDistance * FALL_DELAY_PER_STEP),
      });
    }
  }

  return { appearing: [...new Set(appearing)], falling };
}

function simulateSwapChain(from, to) {
  if (!canSwap(from, to)) return null;

  const state = [...gameState.board];
  swapState(state, from, to);

  let chain = 1;
  const chainRemoved = [];
  while (true) {
    const matches = findMatchesOnBoard(state);
    if (matches.length === 0) break;
    chainRemoved.push(matches.length);
    matches.forEach((i) => {
      state[i] = null;
    });
    dropAndRefillState(state);
    chain++;
  }

  if (chainRemoved.length === 0) return null;

  const chainScores = chainRemoved.map((removedCount, index) => evaluateMatchScore(removedCount, index + 1));
  const totalScore = chainScores.reduce((sum, value) => sum + value, 0);
  return {
    chains: chainRemoved.length,
    totalScore,
    chainScores,
  };
}

function getSwappableMatchHints(i) {
  const hints = [];
  const neighbors = getNeighbors(i);
  for (const next of neighbors) {
    const estimate = simulateSwapChain(i, next);
    if (!estimate) continue;
    hints.push({
      index: next,
      chains: estimate.chains,
      totalScore: estimate.totalScore,
    });
  }
  return hints;
}

function findGlobalHint() {
  let best = null;
  for (let i = 0; i < gameState.board.length; i++) {
    const neighbors = getNeighbors(i);
    for (const to of neighbors) {
      if (to <= i) continue;
      const estimate = simulateSwapChain(i, to);
      if (!estimate) continue;
      if (!best || estimate.totalScore > best.totalScore) {
        best = {
          from: i,
          to,
          chains: estimate.chains,
          totalScore: estimate.totalScore,
        };
      }
    }
  }
  return best;
}

function applyHint() {
  if (gameState.levelResult !== "playing" || gameState.hintUsedThisLevel) return;
  const hint = findGlobalHint();
  if (!hint) {
    setStatusLine(t("hint-empty"));
    return;
  }
  gameState.hintUsedThisLevel = true;
  uiState.activeHint = hint;
  setStatusLine(t("hint-used"));
  updateControls();
  render();
  setTimeout(() => {
    if (uiState.activeHint === hint) {
      uiState.activeHint = null;
      if (!uiState.statusMessage) {
        setStatusLine("");
      }
      render();
    }
  }, 5000);
}

async function settleBoard() {
  let chain = 1;
  let totalScore = 0;
  let totalChains = 0;
  while (true) {
    const matches = findMatches();
    if (matches.length === 0) break;

    const gain = evaluateMatchScore(matches.length, chain);
    totalScore += gain;
    totalChains = chain;

    const tiles = [...boardEl.children];
    matches.forEach((i) => {
      gameState.board[i] = null;
      if (tiles[i]) tiles[i].classList.add("removing");
    });

    render();
    await flashRemoved(140);
    const { appearing, falling } = dropAndRefill();
    render(appearing, falling);
    await flashRemoved(720);

    chain++;
  }

  if (totalScore > 0) {
    gameState.goalProgress += totalScore;
    gameState.score = gameState.goalProgress;
    gameState.lastMoveScore = totalScore;
    gameState.lastMoveChains = totalChains;
    setStatusLine(t("move-result", {
      score: totalScore,
      chains: totalChains,
      plural: totalChains > 1 ? "s" : "",
    }));
    gameState.chainCount = Math.max(gameState.chainCount, totalChains);
  }

  animateScorePop();
  return { totalScore, totalChains };
}

function updateAchievements() {
  if (gameState.lastMoveChains >= 3) {
    achievementState.first3Chain = true;
  }

  if (gameState.lastMoveChains > achievementState.bestChain) {
    achievementState.bestChain = gameState.lastMoveChains;
  }

  if (!achievementState.noInvalidIn20 && gameState.validMovesInLevel >= 20 && gameState.invalidMovesInLevel === 0) {
    achievementState.noInvalidIn20 = true;
  }

  saveStateJson(STORAGE_KEYS.achievements, achievementState);
}

function renderAchievements() {
  if (!achievementList) return;
  const items = [
    `<li>${t("achievement-first-3-chain")} ${achievementState.first3Chain ? "[done]" : "[ ]"}</li>`,
    `<li>${t("achievement-best-chain", { count: Math.max(achievementState.bestChain, 0) })} ${achievementState.bestChain >= 1 ? "[done]" : "[ ]"}</li>`,
    `<li>${t("achievement-no-invalid-20")} ${achievementState.noInvalidIn20 ? "[done]" : "[ ]"}</li>`,
  ];
  achievementList.innerHTML = items.join("");
}

function updateControls() {
  nextLevelBtn.hidden = gameState.levelResult !== "won";
  hintBtn.disabled = gameState.levelResult !== "playing" || gameState.hintUsedThisLevel;
}

function render(appearingIndexes = [], fallingTiles = []) {
  boardEl.innerHTML = "";
  const appearing = new Set(appearingIndexes);
  const fallingMap = new Map(fallingTiles.map((tile) => [tile.toIndex, tile]));
  const swapHints = uiState.selected !== null ? getSwappableMatchHints(uiState.selected) : [];
  const swapHintMap = new Map(swapHints.map((hint) => [hint.index, hint]));

  const neighborSet = uiState.selected !== null ? new Set(getNeighbors(uiState.selected)) : new Set();
  for (let i = 0; i < gameState.board.length; i++) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = `tile type-${gameState.board[i]}`;
    tile.dataset.index = String(i);
    tile.setAttribute("aria-label", `${t("cell-label")} ${i + 1}`);
    tile.textContent = SYMBOLS[gameState.board[i]] || "?";
    if (appearing.has(i)) {
      tile.classList.add("appearing");
      tile.addEventListener("animationend", () => tile.classList.remove("appearing"), { once: true });
    }

    if (fallingMap.has(i)) {
      const { distance, delay } = fallingMap.get(i);
      if (distance > 0) {
        tile.style.setProperty("--drop-distance", distance);
        tile.style.setProperty("--fall-delay", `${delay || 0}ms`);
        tile.classList.add("falling");
        tile.addEventListener("animationend", () => tile.classList.remove("falling"), { once: true });
      }
    }

    tile.addEventListener("click", () => {
      if (uiState.suppressNextClick) {
        uiState.suppressNextClick = false;
        return;
      }
      void handleCellClick(i);
    });
    tile.addEventListener("pointerdown", (event) => handleTilePointerDown(i, event));
    tile.addEventListener("pointerup", (event) => handleTilePointerUp(i, event));
    tile.addEventListener("pointercancel", clearPointerState);
    boardEl.appendChild(tile);
  }

  if (uiState.selected !== null && boardEl.children[uiState.selected]) {
    const selectedTile = boardEl.children[uiState.selected];
    selectedTile.classList.add("selected");
    selectedTile.setAttribute("aria-label", `${t("cell-label")} ${uiState.selected + 1} (${t("aria-selected")})`);
    for (const index of neighborSet) {
      const tile = boardEl.children[index];
      if (tile) tile.classList.add("swap-hint");
    }

    for (const [i, hint] of swapHintMap.entries()) {
      const tile = boardEl.children[i];
      if (!tile) continue;
      tile.classList.remove("swap-hint");
      tile.classList.add("match-hint");
      const badge = document.createElement("span");
      badge.className = "chain-badge";
      badge.textContent = hint.chains > 1 ? `+${hint.totalScore} x${hint.chains}` : `+${hint.totalScore}`;
      tile.setAttribute("aria-label", `${t("cell-label")} ${i + 1} (preview ${t("chain-preview", { score: hint.totalScore, chains: hint.chains })})`);
      tile.appendChild(badge);
    }
  }

  if (!uiState.selected && uiState.activeHint) {
    const fromTile = boardEl.children[uiState.activeHint.from];
    const toTile = boardEl.children[uiState.activeHint.to];
    if (fromTile) fromTile.classList.add("match-hint");
    if (toTile) {
      toTile.classList.add("match-hint");
      const badge = document.createElement("span");
      badge.className = "chain-badge";
      badge.textContent = `+${uiState.activeHint.totalScore} x${uiState.activeHint.chains}`;
      toTile.setAttribute("aria-label", `${t("cell-label")} ${uiState.activeHint.to + 1} (hint)`);
      toTile.appendChild(badge);
    }
  }

  levelEl.textContent = String(gameState.level);
  movesLeftEl.textContent = String(gameState.movesLeft);
  targetScoreEl.textContent = String(gameState.targetScore);
  goalProgressEl.textContent = String(gameState.goalProgress);

  updateControls();
  updateStatus();
  renderAchievements();
}

function getSwipeTarget(fromIndex, dx, dy) {
  const r = rowOf(fromIndex);
  const c = colOf(fromIndex);
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);

  if (Math.max(ax, ay) < SWIPE_THRESHOLD) return null;

  if (ax >= ay) {
    if (dx > 0 && c < SIZE - 1) return index(r, c + 1);
    if (dx < 0 && c > 0) return index(r, c - 1);
    return null;
  }

  if (dy > 0 && r < SIZE - 1) return index(r + 1, c);
  if (dy < 0 && r > 0) return index(r - 1, c);
  return null;
}

function handleTilePointerDown(index, event) {
  if (!canInteract()) return;
  if (event.button !== 0 && event.button !== -1) return;
  event.preventDefault();
  uiState.pointerState = {
    pointerId: event.pointerId,
    index,
    x: event.clientX,
    y: event.clientY,
  };
  tileSetDragState(index, true);
}

function handleTilePointerUp(index, event) {
  if (!uiState.pointerState || event.pointerId !== uiState.pointerState.pointerId) {
    clearPointerState();
    return;
  }

  tileSetDragState(uiState.pointerState.index, false);
  const dx = event.clientX - uiState.pointerState.x;
  const dy = event.clientY - uiState.pointerState.y;
  const abs = Math.max(Math.abs(dx), Math.abs(dy));
  const shouldSwipe = gameState.inputMode === "drag" ? abs >= SWIPE_THRESHOLD : abs >= TAP_THRESHOLD;
  const target = shouldSwipe ? getSwipeTarget(uiState.pointerState.index, dx, dy) : null;

  if (target !== null) {
    uiState.suppressNextClick = true;
    void applyMove(uiState.pointerState.index, target);
    clearPointerState();
    return;
  }

  if (uiState.pointerState.index === index) {
    uiState.suppressNextClick = true;
    void handleCellClick(index);
  }
  clearPointerState();
}

function tileSetDragState(index, active) {
  const tile = boardEl.children[index];
  if (!tile) return;
  tile.classList.toggle("dragging", active);
}

function clearPointerState() {
  if (!uiState.pointerState) return;
  tileSetDragState(uiState.pointerState.index, false);
  uiState.pointerState = null;
}

function completeLevelResult(result) {
  if (result === "won") {
    gameState.levelResult = "won";
    gameProgress.totalWins += 1;
    if (gameProgress.highestUnlockedLevel < gameState.level + 1) {
      gameProgress.highestUnlockedLevel = gameState.level + 1;
    }
    saveStateJson(STORAGE_KEYS.progress, gameProgress);
    setGoalText(t("goal-success"));
    setStatusLine("");
  } else {
    gameState.levelResult = "lost";
    setGoalText(t("goal-fail"));
    setStatusLine(t("status-no-match"));
  }
  updateControls();
}

async function applyMove(from, to) {
  if (!canInteract() || !canSwap(from, to)) return;

  uiState.selected = null;
  uiState.activeHint = null;
  gameState.locked = true;
  setStatusLine("");
  await animateSwapTiles(from, to);
  swapState(gameState.board, from, to);
  render();

  const matches = findMatches();
  if (matches.length === 0) {
    flashNoMatch(from);
    flashInvalidSwap(from, to);
    await flashRemoved(160);
    await animateSwapTiles(from, to);
    swapState(gameState.board, from, to);
    render();
    gameState.invalidMovesInLevel += 1;
    setStatusLine(t("status-no-match"));
    gameState.locked = false;
    markTutorialAdvance();
    return;
  }

  if (!gameState.tutorial.completed) markTutorialAdvance();

  gameState.movesLeft -= 1;
  gameState.validMovesInLevel += 1;

  const result = await settleBoard();
  updateAchievements();
  render();
  if (isGoalReached()) {
    completeLevelResult("won");
    render();
    gameState.locked = false;
    return;
  }
  if (isOutOfMoves()) {
    completeLevelResult("lost");
    render();
    gameState.locked = false;
    return;
  }
  gameState.locked = false;
  updateStatus();
}

function setInputMode(mode) {
  if (mode !== "drag" && mode !== "tap") mode = "drag";
  gameState.inputMode = mode;
  localStorage.setItem(STORAGE_KEYS.inputMode, mode);
  inputModeSelect.value = mode;
}

async function handleCellClick(i) {
  if (!canInteract()) return;

  if (uiState.selected === null) {
    uiState.selected = i;
    render();
    return;
  }

  if (uiState.selected === i) {
    uiState.selected = null;
    render();
    return;
  }

  if (!canSwap(uiState.selected, i)) {
    uiState.selected = i;
    render();
    return;
  }

  await applyMove(uiState.selected, i);
}

function goMainMenu() {
  startLevel(1);
}

function playNextLevel() {
  startLevel(gameState.level + 1);
}

function restart() {
  startLevel(gameState.level);
}

localeSelect.addEventListener("change", (event) => {
  setLocale(event.target.value);
});

restartBtn.addEventListener("click", () => {
  restart();
});

nextLevelBtn.addEventListener("click", () => {
  playNextLevel();
});

mainMenuBtn.addEventListener("click", () => {
  goMainMenu();
});

hintBtn.addEventListener("click", () => {
  applyHint();
});

inputModeSelect.addEventListener("change", (event) => {
  setInputMode(event.target.value);
});

Match3UI.setAriaLiveRegions();

startLevel(gameProgress.currentLevel || 1);
setLocale(currentLocale);
