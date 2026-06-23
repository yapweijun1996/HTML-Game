/* Match-3: level flow helpers */

const Match3Flow = (() => {
  function startTurn(state, uiState) {
    uiState.selected = null;
    uiState.activeHint = null;
    state.levelResult = "playing";
    uiState.statusMessage = "";
    state.locked = false;
  }

function startLevel({
    state,
    progress,
    level,
    getLevelConfig,
    fillBoardWithoutMatches,
    getInputMode,
    saveProgress,
  }) {
    const config = getLevelConfig(level);
    state.level = Math.max(1, Math.floor(level) || 1);
    state.movesLeft = config.moves;
    state.targetScore = config.target;
    state.score = 0;
    state.typeCount = config.typeCount;
    state.goalProgress = 0;
    state.chainCount = 0;
    state.lastMoveChains = 0;
    state.lastMoveScore = 0;
    state.invalidMovesInLevel = 0;
    state.validMovesInLevel = 0;
    state.hintUsedThisLevel = false;
    state.levelResult = "playing";
    state.board = new Array(SIZE * SIZE).fill(0);
    state.inputMode = getInputMode();
    fillBoardWithoutMatches();

    state.tutorial = {
      stage: state.tutorial.stage || 1,
      completed: state.tutorial.completed,
    };

    progress.currentLevel = state.level;
    if (progress.highestUnlockedLevel < state.level) {
      progress.highestUnlockedLevel = state.level;
    }
    if (saveProgress) {
      saveProgress();
    }
  }

  function saveTutorialState(state, saveTutorialState) {
    if (typeof saveTutorialState === "function") {
      saveTutorialState(state.tutorial);
    }
  }

  function markTutorialAdvance(state, saveTutorialState) {
    if (state.tutorial.completed) return;
    if (state.tutorial.stage === 1) {
      state.tutorial.stage = 2;
    } else if (state.tutorial.stage === 2) {
      state.tutorial.completed = true;
    }
    saveTutorialState(state);
  }

  function completeLevelResult(state, gameProgress, result, saveProgress) {
    if (result === "won") {
      state.levelResult = "won";
      gameProgress.totalWins += 1;
      if (gameProgress.highestUnlockedLevel < state.level + 1) {
        gameProgress.highestUnlockedLevel = state.level + 1;
      }
      if (saveProgress) saveProgress();
      return;
    }

    state.levelResult = "lost";
  }

  return {
    startTurn,
    startLevel,
    saveTutorialState,
    markTutorialAdvance,
    completeLevelResult,
  };
})();
