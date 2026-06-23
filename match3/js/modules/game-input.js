/* Match-3: interaction helpers */

const Match3Input = (() => {
  function createPointerHandlers({
    uiState,
    canInteract,
    shouldSwipe,
    getSwipeTarget,
    setDragState,
    setDragOffset,
    applyMove,
    handleCellClick,
  }) {
    const handleTilePointerDown = (index, event) => {
      if (!canInteract()) return;
      if (event.button !== 0 && event.button !== -1) return;
      event.preventDefault();
      if (event.currentTarget?.setPointerCapture) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      uiState.pointerState = {
        pointerId: event.pointerId,
        index,
        x: event.clientX,
        y: event.clientY,
        dragAxisLocked: null,
      };
      setDragState(index, true);
    };

    const clearPointerState = () => {
      if (!uiState.pointerState) return;
      setDragState(uiState.pointerState.index, false);
      if (typeof setDragOffset === "function") {
        setDragOffset(uiState.pointerState.index, 0, 0);
      }
      uiState.pointerState = null;
    };

    const handleTilePointerUp = (index, event) => {
      if (!uiState.pointerState || event.pointerId !== uiState.pointerState.pointerId) {
        clearPointerState();
        return;
      }

      setDragState(uiState.pointerState.index, false);
      const dx = event.clientX - uiState.pointerState.x;
      const dy = event.clientY - uiState.pointerState.y;
      const target = shouldSwipe(dx, dy) ? getSwipeTarget(uiState.pointerState.index, dx, dy) : null;

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
    };

    const handleTilePointerMove = (index, event) => {
      if (!uiState.pointerState || event.pointerId !== uiState.pointerState.pointerId) return;
      if (index !== uiState.pointerState.index) return;
      const dx = event.clientX - uiState.pointerState.x;
      const dy = event.clientY - uiState.pointerState.y;
      if (!dx && !dy) return;

      if (uiState.pointerState.dragAxisLocked === null) {
        uiState.pointerState.dragAxisLocked = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
      }

      const lockedDx = uiState.pointerState.dragAxisLocked === "x" ? dx : 0;
      const lockedDy = uiState.pointerState.dragAxisLocked === "y" ? dy : 0;

      if (typeof setDragOffset === "function") {
        setDragOffset(index, lockedDx, lockedDy);
      }
    };

    return {
      handleTilePointerDown,
      handleTilePointerUp,
      clearPointerState,
      handleTilePointerMove,
    };
  }

  return {
    createPointerHandlers,
  };
})();
