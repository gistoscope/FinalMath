// features/selection/selection-manager.js
// Selection state management and clear functions

import { appState, selectionState } from "../../core/state.js";
import { hideModeIndicator } from "../../ui/hint-indicator.js";
import { clearDomHighlight } from "../../ui/hover-panel.js";
import { clearSelectionVisual } from "../../ui/selection-overlay.js";
import { resetIntegerCycleState } from "../p1/cycle-state.js";

/**
 * Canonical function to clear ALL selection states and visuals.
 * @param {string} reason - Debug reason for clearing
 */
export function clearSelection(reason) {
  console.info("[SEL] clearSelection", { reason });

  // 1. Clear internal selection states
  selectionState.selectedIds.clear();
  selectionState.mode = "none";
  selectionState.primaryId = null;

  // Clear P1 state
  resetIntegerCycleState();

  // 2. Remove integer visual classes from DOM
  const selectedInts = document.querySelectorAll(".p1-integer-selected");
  selectedInts.forEach((el) => {
    el.classList.remove("p1-integer-selected");
    el.style.removeProperty("--p1-highlight-color");
  });

  // 3. Clear overlay
  const overlay = document.getElementById("selection-overlay");
  if (overlay) overlay.innerHTML = "";

  // Force clear via helper if available (handles ensuring overlay exists)
  if (appState.current && appState.current.map) {
    clearSelectionVisual(appState.current.map);
  }

  // 4. Clear hover/focus
  clearDomHighlight();

  // 5. Hide indicator
  hideModeIndicator();
}

/**
 * Rectangle hit-test over all map atoms (for drag selection).
 */
export function hitTestRect(map, rect) {
  if (!map || !map.atoms) return [];
  const results = [];
  for (const node of map.atoms) {
    const b = node.bbox;
    if (
      !(
        rect.right < b.left ||
        rect.left > b.right ||
        rect.bottom < b.top ||
        rect.top > b.bottom
      )
    ) {
      results.push(node);
    }
  }
  return results;
}
