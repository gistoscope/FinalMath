// features/p1/cycle-state.ts
// P1 integer selection cycle state management

import { integerCycleState, MODE_GREEN } from "../../core/state";
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

  clearIntegerHighlight();

  console.log("[P1] Reset integer cycle state");
}
