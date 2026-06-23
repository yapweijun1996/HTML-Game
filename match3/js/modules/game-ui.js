/* Match-3: UI DOM element SSOT module */

const Match3UI = (() => {
  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const statusHintEl = document.getElementById("status-hint");
  const goalMessageEl = document.getElementById("goal-message");
  const levelEl = document.getElementById("level");
  const movesLeftEl = document.getElementById("moves-left");
  const targetScoreEl = document.getElementById("target-score");
  const goalProgressEl = document.getElementById("goal-progress");
  const scoreBox = document.getElementById("score-box");
  const localeSelect = document.getElementById("locale");
  const inputModeSelect = document.getElementById("input-mode");
  const restartBtn = document.getElementById("restart");
  const nextLevelBtn = document.getElementById("next-level");
  const mainMenuBtn = document.getElementById("main-menu");
  const hintBtn = document.getElementById("hint");
  const achievementList = document.getElementById("achievements");

  const tNodes = document.querySelectorAll("[data-i18n]");
  const tAriaNodes = document.querySelectorAll("[data-i18n-aria]");
  const boardAria = document.getElementById("board");

  const setAriaLiveRegions = () => {
    statusHintEl.setAttribute("aria-live", "polite");
    statusEl.setAttribute("aria-live", "polite");
    goalMessageEl.setAttribute("aria-live", "assertive");
  };

  return {
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
    setAriaLiveRegions,
  };
})();
