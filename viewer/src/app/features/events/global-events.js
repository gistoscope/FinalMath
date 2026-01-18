// features/events/global-events.js
// Global event handlers (keyboard, outside click, resize)

import {
  appState,
  integerCycleState,
  selectionState,
} from "../../core/state.js";
import { clearDomHighlight } from "../../ui/hover-panel.js";
import { applySelectionVisual } from "../../ui/selection-overlay.js";
import { resetIntegerCycleState } from "../p1/cycle-state.js";
import { clearSelection } from "../selection/selection-manager.js";

/**
 * Setup global event handlers
 * @param {Function} renderFormula - Render formula function
 * @param {Function} buildAndShowMap - Build and show map function
 */
export function setupGlobalEvents(renderFormula, buildAndShowMap) {
  // Esc Key Handler
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      // Ignore if typing in an input
      const tag = e.target.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      console.info("[SEL] clear via button/esc");
      clearSelection("esc");
    }
  });

  // Click Outside to Clear Selection
  document.addEventListener("pointerup", (e) => {
    // Only proceed if we have an active selection
    const hasSelection =
      selectionState.selectedIds.size > 0 || integerCycleState.selectedNodeId;
    if (!hasSelection) return;

    // Don't clear if clicking on the diag panels or context menu
    if (e.target.closest("#p1-diagnostics-panel")) return;
    if (e.target.closest("#choice-popup")) return;

    const container = document.getElementById("formula-container");
    if (!container) return;

    // Check if click is inside the container
    if (container.contains(e.target)) return;

    // Calculate dynamic threshold (approx 1 character width)
    let thresholdPx = 12; // Fallback
    try {
      const testSpan = document.createElement("span");
      testSpan.style.visibility = "hidden";
      testSpan.style.position = "absolute";
      testSpan.style.font = window.getComputedStyle(container).font;
      testSpan.textContent = "0";
      container.appendChild(testSpan);
      const w = testSpan.getBoundingClientRect().width;
      if (w > 0) thresholdPx = w;
      testSpan.remove();
    } catch (err) {
      // Ignore measurement errors
    }

    const box = container.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    const isOutside =
      x < box.left - thresholdPx ||
      x > box.right + thresholdPx ||
      y < box.top - thresholdPx ||
      y > box.bottom + thresholdPx;

    if (isOutside) {
      console.log(
        `[Viewer] Click outside detected (threshold=${thresholdPx.toFixed(1)}px) - clearing selection`,
      );
      selectionState.selectedIds.clear();
      selectionState.mode = "none";
      selectionState.primaryId = null;
      resetIntegerCycleState();
      if (appState.current && appState.current.map) {
        applySelectionVisual(appState.current.map);
      }
      clearDomHighlight();
    }
  });

  // Debounced rebuild on window resize
  let __resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(__resizeTimer);
    __resizeTimer = setTimeout(() => {
      renderFormula();
      buildAndShowMap();
    }, 120);
  });

  // Click Outside to Clear Selection (Robust Capture Phase)
  window.addEventListener(
    "pointerdown",
    (e) => {
      const p1Active = integerCycleState.selectedNodeId !== null;
      const selActive = selectionState.selectedIds.size > 0;
      const overlayHasChildren = !!document.querySelector(
        "#selection-overlay > div",
      );
      const domHasClasses = !!document.querySelector(".p1-integer-selected");

      if (!p1Active && !selActive && !overlayHasChildren && !domHasClasses) {
        return;
      }

      if (e.target.closest("#p1-diagnostics-panel")) return;
      if (e.target.closest("#choice-popup")) return;

      const containerEl = document.getElementById("formula-container");
      if (!containerEl) return;

      if (containerEl.contains(e.target)) return;

      let thresholdPx = 12;
      try {
        const testSpan = document.createElement("span");
        testSpan.style.visibility = "hidden";
        testSpan.style.position = "absolute";
        testSpan.style.font = window.getComputedStyle(containerEl).font;
        testSpan.textContent = "0";
        containerEl.appendChild(testSpan);
        const w = testSpan.getBoundingClientRect().width;
        if (w > 0) thresholdPx = w;
        testSpan.remove();
      } catch (err) {
        // Ignore
      }

      const box = containerEl.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;

      const isOutside =
        x < box.left - thresholdPx ||
        x > box.right + thresholdPx ||
        y < box.top - thresholdPx ||
        y > box.bottom + thresholdPx;

      if (isOutside) {
        console.info(`[SEL] outside-click`, {
          cleared: true,
          threshold: thresholdPx,
        });
        clearSelection("outside-click");
      }
    },
    { capture: true },
  );
}
