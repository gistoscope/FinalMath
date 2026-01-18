// features/rendering/surface-map-builder.js
// Surface map building and management

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
 * @returns {object|null} The current app state or null
 */
export function buildAndShowMap() {
  /** @type {HTMLElement|null} */
  const container = document.getElementById("formula-container");
  if (!container) return null;

  let map = buildSurfaceNodeMap(container);
  map = enhanceSurfaceMap(map, container);
  map = correlateOperatorsWithAST(map, getCurrentLatex());

  // STABLE-ID: Scan DOM for data-ast-id elements (render-time injection)
  scanDOMForStableIds(map, container);
  assertDOMStableIds(container);
  const serializable = surfaceMapToSerializable(map);

  const pre = document.getElementById("surface-json");
  if (pre) {
    pre.textContent = JSON.stringify(serializable, null, 2);
  }

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
