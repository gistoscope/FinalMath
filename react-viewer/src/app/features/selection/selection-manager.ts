// features/selection/selection-manager.ts
// Selection state management and clear functions

import { appState, selectionState } from "../../core/state";
import { hideModeIndicator } from "../../ui/hint-indicator";
import { clearDomHighlight } from "../../ui/hover-panel";
import { clearSelectionVisual } from "../../ui/selection-overlay";
import { resetIntegerCycleState } from "../p1/cycle-state";

import { SurfaceNode } from "../../surface-map/surface-node";

/**
 * Canonical function to clear ALL selection states and visuals.
 */
export function clearSelection(reason: string) {
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
    (el as HTMLElement).classList.remove("p1-integer-selected");
    (el as HTMLElement).style.removeProperty("--p1-highlight-color");
  });

  // 3. Clear overlay
  const overlay = document.getElementById("selection-overlay");
  if (overlay) overlay.innerHTML = "";

  // Force clear via helper if available
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
export function hitTestRect(
  map: { atoms: SurfaceNode[] },
  rect: { left: number; top: number; right: number; bottom: number },
): SurfaceNode[] {
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
