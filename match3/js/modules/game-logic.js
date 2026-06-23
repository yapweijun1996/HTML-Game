/* Match-3: pure logic helpers (SSOT helper module) */

const Match3Logic = (() => {
  function index(row, col, size = SIZE) {
    return row * size + col;
  }

  function rowOf(i, size = SIZE) {
    return Math.floor(i / size);
  }

  function colOf(i, size = SIZE) {
    return i % size;
  }

  function randomType(typeCount = BASE_TYPES) {
    return Math.floor(Math.random() * typeCount);
  }

  function getNeighbors(i, size = SIZE) {
    const r = rowOf(i, size);
    const c = colOf(i, size);
    const out = [];
    if (r > 0) out.push(index(r - 1, c, size));
    if (r < size - 1) out.push(index(r + 1, c, size));
    if (c > 0) out.push(index(r, c - 1, size));
    if (c < size - 1) out.push(index(r, c + 1, size));
    return out;
  }

  function canSwap(i, j, size = SIZE) {
    return getNeighbors(i, size).includes(j);
  }

  function canInteract(state) {
    return state.levelResult === "playing" && !state.locked;
  }

  function swapState(state, i, j) {
    const temp = state[i];
    state[i] = state[j];
    state[j] = temp;
  }

  function hasMatchAt(i, state, size = SIZE) {
    const value = state[i];
    if (value === null) return false;

    const r = rowOf(i, size);
    const c = colOf(i, size);

    let count = 1;
    for (let col = c - 1; col >= 0; col--) {
      if (state[index(r, col, size)] === value) count++;
      else break;
    }
    for (let col = c + 1; col < size; col++) {
      if (state[index(r, col, size)] === value) count++;
      else break;
    }
    if (count >= 3) return true;

    count = 1;
    for (let row = r - 1; row >= 0; row--) {
      if (state[index(row, c, size)] === value) count++;
      else break;
    }
    for (let row = r + 1; row < size; row++) {
      if (state[index(row, c, size)] === value) count++;
      else break;
    }
    return count >= 3;
  }

  function findMatchesOnBoard(state, size = SIZE) {
    const matches = new Set();

    for (let r = 0; r < size; r++) {
      let start = 0;
      while (start < size) {
        let end = start + 1;
        while (end < size && state[index(r, end, size)] === state[index(r, start, size)]) end++;
        if (end - start >= 3) {
          for (let c = start; c < end; c++) matches.add(index(r, c, size));
        }
        start = end;
      }
    }

    for (let c = 0; c < size; c++) {
      let start = 0;
      while (start < size) {
        let end = start + 1;
        while (end < size && state[index(end, c, size)] === state[index(start, c, size)]) end++;
        if (end - start >= 3) {
          for (let r = start; r < end; r++) matches.add(index(r, c, size));
        }
        start = end;
      }
    }

    return [...matches];
  }

  function findMatches(state, size = SIZE) {
    return findMatchesOnBoard(state, size);
  }

  function hasMatches(state, size = SIZE) {
    return findMatchesOnBoard(state, size).length > 0;
  }

  function fillBoardWithoutMatches(state, typeCount = BASE_TYPES) {
    for (let i = 0; i < state.length; i++) {
      state[i] = randomType(typeCount);
    }

    let attempts = 0;
    while (hasMatches(state) && attempts < 150) {
      for (let i = 0; i < state.length; i++) {
        if (hasMatchAt(i, state)) {
          state[i] = randomType(typeCount);
        }
      }
      attempts++;
    }
  }

  function dropAndRefillState(state, size = SIZE) {
    for (let c = 0; c < size; c++) {
      let write = size - 1;

      for (let r = size - 1; r >= 0; r--) {
        const source = index(r, c, size);
        if (state[source] !== null) {
          const target = index(write, c, size);
          state[target] = state[source];
          if (target !== source) state[source] = null;
          write--;
        }
      }

      for (let r = write; r >= 0; r--) {
        state[index(r, c, size)] = null;
      }
    }
  }

  function dropAndRefill(state, typeCount = BASE_TYPES) {
    const appearing = [];
    const falling = [];
    const size = SIZE;

    for (let c = 0; c < size; c++) {
      const values = [];
      for (let r = 0; r < size; r++) {
        const i = index(r, c, size);
        if (state[i] !== null) values.push({ row: r, value: state[i] });
      }

      let write = size - 1;
      for (let i = values.length - 1; i >= 0; i--) {
        const info = values[i];
        const from = info.row;
        const to = write;
        const target = index(to, c, size);
        state[target] = info.value;
        if (target !== index(from, c, size)) {
          falling.push({
            fromIndex: index(from, c, size),
            toIndex: target,
            distance: to - from,
            delay: Math.min(FALL_MAX_DELAY, FALL_BASE_DELAY + (to - from) * FALL_DELAY_PER_STEP),
          });
        }
        write--;
      }

      const spawnDistance = write + 1;
      for (let r = write; r >= 0; r--) {
        state[index(r, c, size)] = randomType(typeCount);
        appearing.push(index(r, c, size));
        falling.push({
          fromIndex: index(r - spawnDistance, c, size),
          toIndex: index(r, c, size),
          distance: spawnDistance,
          delay: Math.min(FALL_MAX_DELAY, FALL_BASE_DELAY + spawnDistance * FALL_DELAY_PER_STEP),
        });
      }
    }

    return { appearing: [...new Set(appearing)], falling };
  }

  function simulateSwapChain(state, from, to, typeCount = BASE_TYPES) {
    if (!canSwap(from, to)) return null;

    const nextState = [...state];
    swapState(nextState, from, to);

    let chain = 1;
    const chainRemoved = [];
    while (true) {
      const matches = findMatchesOnBoard(nextState);
      if (matches.length === 0) break;
      chainRemoved.push(matches.length);
      matches.forEach((i) => {
        nextState[i] = null;
      });
      dropAndRefillState(nextState);
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

  function getSwappableMatchHints(state, i) {
    const hints = [];
    const neighbors = getNeighbors(i);
    for (const next of neighbors) {
      const estimate = simulateSwapChain(state, i, next);
      if (!estimate) continue;
      hints.push({
        index: next,
        chains: estimate.chains,
        totalScore: estimate.totalScore,
      });
    }
    return hints;
  }

  function findGlobalHint(state, typeCount = BASE_TYPES) {
    let best = null;
    const total = state.length;
    const size = SIZE;
    for (let i = 0; i < total; i++) {
      const neighbors = getNeighbors(i, size);
      for (const to of neighbors) {
        if (to <= i) continue;
        const estimate = simulateSwapChain(state, i, to, typeCount);
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

  function getSwipeTarget(fromIndex, dx, dy, size = SIZE) {
    const r = rowOf(fromIndex, size);
    const c = colOf(fromIndex, size);
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);

    if (Math.max(ax, ay) < SWIPE_THRESHOLD) return null;

    if (ax >= ay) {
      if (dx > 0 && c < size - 1) return index(r, c + 1, size);
      if (dx < 0 && c > 0) return index(r, c - 1, size);
      return null;
    }

    if (dy > 0 && r < size - 1) return index(r + 1, c, size);
    if (dy < 0 && r > 0) return index(r - 1, c, size);
    return null;
  }

  function getChainMultiplier(chainIndex) {
    return chainIndex >= 4 ? 4 : chainIndex;
  }

  function evaluateMatchScore(matches, chainIndex) {
    return matches * 10 * getChainMultiplier(chainIndex);
  }

  function isGoalReached(state) {
    return state.goalProgress >= state.targetScore;
  }

  function isOutOfMoves(state) {
    return state.movesLeft <= 0;
  }

  return {
    index,
    rowOf,
    colOf,
    randomType,
    getNeighbors,
    canSwap,
    canInteract,
    swapState,
    hasMatchAt,
    findMatchesOnBoard,
    findMatches,
    hasMatches,
    fillBoardWithoutMatches,
    dropAndRefillState,
    dropAndRefill,
    simulateSwapChain,
    getSwappableMatchHints,
    findGlobalHint,
    getSwipeTarget,
    getChainMultiplier,
    evaluateMatchScore,
    isGoalReached,
    isOutOfMoves,
  };
})();
