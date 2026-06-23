/* Match-3: UI animation helpers */

const Match3Animations = (() => {
  const flashRemoved = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

  const animateSwapTiles = (boardEl, from, to) => {
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
  };

  const flashNoMatch = (boardEl, i) => {
    const tile = boardEl.children[i];
    if (!tile) return;
    tile.classList.add("shake");
    tile.addEventListener("animationend", () => tile.classList.remove("shake"), { once: true });
  };

  const flashInvalidSwap = (boardEl, from, to) => {
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
  };

  const setTileDragState = (boardEl, index, active) => {
    const tile = boardEl.children[index];
    if (!tile) return;
    tile.classList.toggle("dragging", active);
  };

  return {
    flashRemoved,
    animateSwapTiles,
    flashNoMatch,
    flashInvalidSwap,
    setTileDragState,
  };
})();
