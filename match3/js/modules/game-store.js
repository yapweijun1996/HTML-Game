/* Match-3: game state + persistence SSOT module */

const Match3Store = (() => {
  const defaultProgress = {
    currentLevel: 1,
    highestUnlockedLevel: 1,
    bestChain: 1,
    totalWins: 0,
  };

  const defaultTutorial = {
    completed: false,
    stage: 1,
  };

  const defaultAchievements = {
    first3Chain: false,
    bestChain: 0,
    noInvalidIn20: false,
  };

  function loadStateJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return JSON.parse(JSON.stringify(fallback));
      const value = JSON.parse(raw);
      if (!value || typeof value !== "object") return JSON.parse(JSON.stringify(fallback));
      return value;
    } catch (_error) {
      return JSON.parse(JSON.stringify(fallback));
    }
  }

  function saveStateJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getLevelConfig(level) {
    const normalized = Math.max(1, Math.floor(level));
    return {
      moves: MOVES_START + (normalized - 1) * MOVES_STEP,
      target: TARGET_START + (normalized - 1) * TARGET_STEP,
      typeCount: Math.min(MAX_TYPES, BASE_TYPES + Math.floor(normalized / 2)),
    };
  }

  function createGameState(level) {
    const stage = Math.max(1, Number(level) || 1);
    return {
      level: stage,
      movesLeft: MOVES_START,
      targetScore: TARGET_START,
      goalProgress: 0,
      score: 0,
      typeCount: BASE_TYPES,
      board: new Array(SIZE * SIZE).fill(0),
      selected: null,
      locked: false,
      chainCount: 0,
      locale: "en",
      invalidMovesInLevel: 0,
      validMovesInLevel: 0,
      hintUsedThisLevel: false,
      lastMoveChains: 0,
      lastMoveScore: 0,
      inputMode: "drag",
      levelResult: "playing",
      hintPair: null,
      tutorial: {
        stage: 1,
        completed: false,
      },
    };
  }

  const gameProgress = loadStateJson(STORAGE_KEYS.progress, defaultProgress);
  const tutorialState = loadStateJson(STORAGE_KEYS.tutorial, defaultTutorial);
  const achievementState = loadStateJson(STORAGE_KEYS.achievements, defaultAchievements);
  const gameState = createGameState(gameProgress.currentLevel || 1);
  const state = {
    selected: null,
    pointerState: null,
    suppressNextClick: false,
    activeHint: null,
    statusMessage: "",
  };

  return {
    gameState,
    gameProgress,
    tutorialState,
    achievementState,
    state,
    defaultProgress,
    defaultTutorial,
    defaultAchievements,
    loadStateJson,
    saveStateJson,
    getLevelConfig,
    createGameState,
  };
})();
