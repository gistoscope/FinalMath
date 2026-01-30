// ui/hint-indicator.ts
// P1 hint indicator UI component

import {
  integerCycleState,
  MODE_BLUE,
  MODE_CONFIG,
  MODE_GREEN,
} from "../core/state";
import { updateP1Diagnostics } from "./diagnostics-panel";

/**
 * Show clickable mode indicator with CAPTURE-PHASE BLOCKING
 */
export function showModeIndicator(
  primitive: any,
  surfaceNodeId: string,
  _cycleIndex: number,
  onApply: (source?: string) => Promise<any> | any,
) {
  let indicator = document.getElementById("p1-hint-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "p1-hint-indicator";
    indicator.className = "p1-hint-container";
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

    const captureBlocker = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log(`[P1-HINT][BLOCK] Blocked ${e.type} in capture phase`);
      updateP1Diagnostics({ hintClickBlocked: "YES" });
    };

    indicator.addEventListener("pointerdown", captureBlocker, {
      capture: true,
    });
    indicator.addEventListener("mousedown", captureBlocker, { capture: true });

    indicator.addEventListener("mouseenter", () => {
      if (indicator) {
        indicator.style.transform = "scale(1.02)";
        indicator.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
      }
    });
    indicator.addEventListener("mouseleave", () => {
      if (indicator) {
        indicator.style.transform = "scale(1)";
        indicator.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
      }
    });

    document.body.appendChild(indicator);
  }

  let label = primitive.label;
  if (integerCycleState.mode === MODE_BLUE && integerCycleState.step2Info) {
    const targetDenom = integerCycleState.step2Info.oppositeDenom;
    label = `Convert 1 → ${targetDenom}/${targetDenom}`;
    console.log(
      `[BLUE-SHOW] stableKey=${integerCycleState.stableKey} astId=${integerCycleState.astNodeId} side=${integerCycleState.step2Info.side} oppositeDenom=${targetDenom} primitiveId=P.ONE_TO_TARGET_DENOM`,
    );
  } else if (integerCycleState.mode === MODE_GREEN) {
    label = "Selected (click to cycle)";
  }

  indicator.textContent = `${label} (click to apply)`;
  indicator.style.backgroundColor = primitive.color;
  indicator.style.display = "block";

  updateP1Diagnostics({
    selectedSurfaceNodeId: surfaceNodeId,
    resolvedAstNodeId: integerCycleState.astNodeId || "MISSING",
    primitiveId: primitive.id,
    hintClickBlocked: "N/A",
  });

  indicator.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

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
    indicator.onclick = null;
  }
}

/**
 * Apply visual highlight to selected integer
 */
export function applyIntegerHighlight(
  surfaceNodeId: string,
  mode: number,
  onApply: (source?: string) => Promise<any> | any,
) {
  clearIntegerHighlight();
  const modeConfig = MODE_CONFIG[mode] || MODE_CONFIG[MODE_GREEN];
  const el = document.querySelector(
    `[data-surface-id="${surfaceNodeId}"]`,
  ) as HTMLElement;
  if (el) {
    el.classList.add("p1-integer-selected");
    el.style.setProperty("--p1-highlight-color", modeConfig.color);
    console.log(
      `[P1] Applied highlight to ${surfaceNodeId} with color ${modeConfig.color} (mode=${mode})`,
    );
  }
  showModeIndicator(modeConfig, surfaceNodeId, mode, onApply);
}

/**
 * Clear integer highlight
 */
export function clearIntegerHighlight() {
  document.querySelectorAll(".p1-integer-selected").forEach((el) => {
    el.classList.remove("p1-integer-selected");
    (el as HTMLElement).style.removeProperty("--p1-highlight-color");
  });
  hideModeIndicator();
}
