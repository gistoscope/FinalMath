// ui/hint-indicator.js
// P1 hint indicator UI component

import {
  integerCycleState,
  MODE_BLUE,
  MODE_CONFIG,
  MODE_GREEN,
} from "../core/state.js";
import { updateP1Diagnostics } from "./diagnostics-panel.js";

/**
 * Show clickable mode indicator with CAPTURE-PHASE BLOCKING
 * @param {object} primitive - Mode config object
 * @param {string} surfaceNodeId - Surface node ID
 * @param {number} cycleIndex - Current cycle index/mode
 * @param {Function} onApply - Callback when indicator is clicked
 */
export function showModeIndicator(
  primitive,
  surfaceNodeId,
  cycleIndex,
  onApply,
) {
  let indicator = document.getElementById("p1-hint-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "p1-hint-indicator";
    indicator.className = "p1-hint-container"; // For guard checks
    indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: bold;
      color: white;
      z-index: 9999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: pointer;
      user-select: none;
      transition: transform 0.1s, box-shadow 0.1s;
    `;

    // CAPTURE-PHASE BLOCKING: Prevent ALL events from reaching global handlers
    const captureBlocker = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log(`[P1-HINT][BLOCK] Blocked ${e.type} in capture phase`);
      updateP1Diagnostics({ hintClickBlocked: "YES" });
    };

    // Add capture-phase blockers
    indicator.addEventListener("pointerdown", captureBlocker, {
      capture: true,
    });
    indicator.addEventListener("mousedown", captureBlocker, { capture: true });

    // Add hover effect
    indicator.addEventListener("mouseenter", () => {
      indicator.style.transform = "scale(1.02)";
      indicator.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
    });
    indicator.addEventListener("mouseleave", () => {
      indicator.style.transform = "scale(1)";
      indicator.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
    });

    document.body.appendChild(indicator);
  }

  // Build label - for BLUE mode, show actual target denom from step2Info
  let label = primitive.label;
  if (integerCycleState.mode === MODE_BLUE && integerCycleState.step2Info) {
    const targetDenom = integerCycleState.step2Info.oppositeDenom;
    label = `Convert 1 → ${targetDenom}/${targetDenom}`;
    // Log BLUE display with all Step2 info
    console.log(
      `[BLUE-SHOW] stableKey=${integerCycleState.stableKey} astId=${integerCycleState.astNodeId} side=${integerCycleState.step2Info.side} oppositeDenom=${targetDenom} primitiveId=P.ONE_TO_TARGET_DENOM`,
    );
  } else if (integerCycleState.mode === MODE_GREEN) {
    label = "Selected (click to cycle)";
  }

  indicator.textContent = `${label} (click to apply)`;
  indicator.style.backgroundColor = primitive.color;
  indicator.style.display = "block";

  // Update diagnostics
  updateP1Diagnostics({
    selectedSurfaceNodeId: surfaceNodeId,
    resolvedAstNodeId: integerCycleState.astNodeId || "MISSING",
    primitiveId: primitive.id,
    hintClickBlocked: "N/A",
  });

  // Make indicator clickable - applies the current mode's action
  // CRITICAL: Use single gateway function, no captured params
  indicator.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // Call single gateway - reads mode from state at call time
    if (onApply) {
      await onApply("[HINT-APPLY]");
    }
  };
}

/**
 * Hide mode indicator
 */
export function hideModeIndicator() {
  const indicator = document.getElementById("p1-hint-indicator");
  if (indicator) {
    indicator.style.display = "none";
    indicator.onclick = null; // Clear click handler
  }
}

/**
 * Apply visual highlight to selected integer
 * @param {string} surfaceNodeId - Surface node ID
 * @param {number} mode - Current mode
 * @param {Function} onApply - Callback for indicator click
 */
export function applyIntegerHighlight(surfaceNodeId, mode, onApply) {
  clearIntegerHighlight();
  const modeConfig = MODE_CONFIG[mode] || MODE_CONFIG[MODE_GREEN];
  const el = document.querySelector(`[data-surface-id="${surfaceNodeId}"]`);
  if (el) {
    el.classList.add("p1-integer-selected");
    el.style.setProperty("--p1-highlight-color", modeConfig.color);
    console.log(
      `[P1] Applied highlight to ${surfaceNodeId} with color ${modeConfig.color} (mode=${mode})`,
    );
  }
  // Also show mode indicator (now clickable)
  showModeIndicator(modeConfig, surfaceNodeId, mode, onApply);
}

/**
 * Clear integer highlight
 */
export function clearIntegerHighlight() {
  document.querySelectorAll(".p1-integer-selected").forEach((el) => {
    el.classList.remove("p1-integer-selected");
    el.style.removeProperty("--p1-highlight-color");
  });
  hideModeIndicator();
}
