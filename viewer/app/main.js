// main.js
// Demo: canonical KaTeX formula + SurfaceNodeMap + interactive hover/click.
// Refactored: imports modular components for separation of concerns.

// ============================================================
// ENGINE IMPORTS
// ============================================================
import {
  displayAdapter,
  eventRecorder,
  fileBus,
  initializeAdapters,
} from "./features/engine/index.js";

// ============================================================
// P1 IMPORTS
// ============================================================
import {
  runP1OrderTest,
  runP1SelfTest,
  setOnHintApplySuccess,
} from "./features/p1/index.js";

// ============================================================
// RENDERING IMPORTS
// ============================================================
import { buildAndShowMap, renderFormula } from "./features/rendering/index.js";

// ============================================================
// SELECTION IMPORTS
// ============================================================
import { clearSelection } from "./features/selection/index.js";

// ============================================================
// ENGINE RESPONSE IMPORTS
// ============================================================
import { setEngineResponseCallbacks } from "./features/engine/index.js";

// ============================================================
// EVENTS IMPORTS
// ============================================================
import {
  setupButtonHandlers,
  setupContainerEvents,
  setupGlobalEvents,
} from "./features/events/index.js";

// ============================================================
// DEBUG IMPORTS
// ============================================================
import { setupDebugPanel } from "./features/debug/index.js";

// ============================================================
// INITIALIZE ADAPTERS
// ============================================================
initializeAdapters();

// ============================================================
// EXPOSE TEST FUNCTIONS
// ============================================================
if (typeof window !== "undefined") {
  window.runP1SelfTest = () => runP1SelfTest(renderFormula, buildAndShowMap);
  window.runP1OrderTest = (order) =>
    runP1OrderTest(order, renderFormula, buildAndShowMap);
}

// ============================================================
// CALLBACKS SETUP
// ============================================================

/**
 * Callback for when hint is applied successfully
 */
function onHintApplySuccess(newLatex) {
  renderFormula();
  buildAndShowMap();
  clearSelection("latex-changed");
}

// Set the callback for integer click handler
setOnHintApplySuccess(onHintApplySuccess);

// Set the callbacks for engine response handler
setEngineResponseCallbacks(renderFormula, buildAndShowMap, clearSelection);

// ============================================================
// DOM CONTENT LOADED - MAIN INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  // Initial render
  const container = renderFormula();
  buildAndShowMap();

  // Setup button handlers
  setupButtonHandlers({
    renderFormula,
    buildAndShowMap,
    eventRecorder,
    fileBus,
  });

  // Setup global events (keyboard, outside click, resize)
  setupGlobalEvents(renderFormula, buildAndShowMap);

  // Setup debug panel
  setupDebugPanel(fileBus);

  // Setup container events (pointer, drag selection)
  if (container) {
    setupContainerEvents(container, displayAdapter);
  }

  console.info("[SEL] init", { entry: "app/main.js" });
});
