// features/rendering/surface-map-builder.js
// Surface map building and management
import { uiBridge } from "../../services/ui-bridge.ts";

import {
  assertDOMStableIds,
  scanDOMForStableIds,
} from "../../core/stable-id.js";
import { appState, getCurrentLatex } from "../../core/state.js";
import {
  buildSurfaceNodeMap,
  correlateOperatorsWithAST,
  enhanceSurfaceMap,
  surfaceMapToSerializable,
} from "../../surface-map.js";
import { clearDomHighlight, updateHoverPanel } from "../../ui/hover-panel.js";
import { resetIntegerCycleState } from "../p1/cycle-state.js";

/**
 * Build and show the surface map for the formula container
 * @param {HTMLElement} [container] - Optional container (falls back to document.getElementById)
 * @param {string} [latex] - Optional LaTeX expression (falls back to global state)
 * @returns {object|null} The current app state or null
 */
export function buildAndShowMap(container, latex) {
  /** @type {HTMLElement|null} */
  const targetContainer =
    container || document.getElementById("formula-container");
  if (!targetContainer) return null;

  const currentLatex = latex || getCurrentLatex();

  let map = buildSurfaceNodeMap(targetContainer);
  map = enhanceSurfaceMap(map, targetContainer);
  map = correlateOperatorsWithAST(map, currentLatex);

  // STABLE-ID: Scan DOM for data-ast-id elements (render-time injection)
  scanDOMForStableIds(map, targetContainer);
  assertDOMStableIds(targetContainer);
  const serializable = surfaceMapToSerializable(map);

  uiBridge.setSurfaceMap(serializable);

  appState.current = { map, serializable };
  if (typeof window !== "undefined") {
    window.current = appState.current;
    window.__currentSurfaceMap = map;
  }
  clearDomHighlight();
  updateHoverPanel("hover", null);
  updateHoverPanel("click", null);

  // P1: Reset integer cycle state when expression changes
  resetIntegerCycleState();

  return appState.current;
}
