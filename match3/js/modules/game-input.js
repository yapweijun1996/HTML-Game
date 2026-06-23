/* Match-3: interaction helpers */

const Match3Input = (() => {
  function createPointerHandlers({
    uiState,
    canInteract,
    shouldSwipe,
    getSwipeTarget,
    setDragState,
    applyMove,
    handleCellClick,
  }) {
    const handleTilePointerDown = (index, event) => {
      if (!canInteract()) return;
      if (event.button !== 0 && event.button !== -1) return;
      event.preventDefault();
      uiState.pointerState = {
        pointerId: event.pointerId,
        index,
        x: event.clientX,
        y: event.clientY,
      };
      setDragState(index, true);
    };

    const clearPointerState = () => {
      if (!uiState.pointerState) return;
      setDragState(uiState.pointerState.index, false);
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

    return {
      handleTilePointerDown,
      handleTilePointerUp,
      clearPointerState,
    };
  }

  return {
    createPointerHandlers,
  };
})();
