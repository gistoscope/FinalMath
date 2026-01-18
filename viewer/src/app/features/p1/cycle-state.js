// features/p1/cycle-state.js
// P1 integer selection cycle state management

import { integerCycleState, MODE_GREEN } from "../../core/state.js";
import { clearIntegerHighlight } from "../../ui/hint-indicator.js";

/**
 * P1: Clear integer selection on expression change
 */
export function resetIntegerCycleState() {
  // Clear any pending click timeout
  if (integerCycleState.pendingClickTimeout) {
    clearTimeout(integerCycleState.pendingClickTimeout);
    integerCycleState.pendingClickTimeout = null;
  }
  integerCycleState.selectedNodeId = null;
  integerCycleState.astNodeId = null;
  integerCycleState.stableKey = null;
  integerCycleState.mode = MODE_GREEN;
  integerCycleState.isStep2Context = false;
  integerCycleState.step2Info = null;
  integerCycleState.cycleIndex = 0;
  integerCycleState.lastClickTime = 0;
  integerCycleState.lastClickNodeId = null;
  // FIX: Do NOT clear perTokenModeMap on expression change!
  // Tokens that still exist after Step2 apply should retain their saved mode.
  clearIntegerHighlight();
  if (window.__debugStep2Cycle) {
    console.log(
      "[STEP2-CYCLE] resetIntegerCycleState: Cleared current selection but preserved perTokenModeMap",
    );
  }
  console.log("[P1] Reset integer cycle state");
}

// Expose integerCycleState globally for engine-adapter access
if (typeof window !== "undefined") {
  window.__p1IntegerCycleState = integerCycleState;
}
