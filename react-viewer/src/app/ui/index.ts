// ui/index.ts
// UI module exports

export {
  applyChoice,
  hideChoicePopup,
  showChoicePopup,
} from "./choice-popup.js";
export {
  createP1DiagnosticsPanel,
  escapeHtml,
  updateP1Diagnostics,
} from "./diagnostics-panel.js";
export {
  applyIntegerHighlight,
  clearIntegerHighlight,
  hideModeIndicator,
  showModeIndicator,
} from "./hint-indicator.js";
export {
  clearDomHighlight,
  getLastHoverNode,
  highlightNode,
  setLastHoverNode,
} from "./hover-panel.js";
export {
  applySelectionVisual,
  clearSelectionVisual,
  ensureSelectionOverlay,
  paintSelectionRects,
} from "./selection-overlay.js";
