// features/rendering/surface-map-builder.ts
// Surface map building and management

import { assertDOMStableIds, scanDOMForStableIds } from "../../core/stable-id";
import { appState, getCurrentLatex } from "../../core/state";
import {
  buildSurfaceNodeMap,
  correlateOperatorsWithAST,
  enhanceSurfaceMap,
  surfaceMapToSerializable,
} from "../../surface-map";
import { clearDomHighlight } from "../../ui/hover-panel.js";
import { resetIntegerCycleState } from "../p1/cycle-state.js";

/**
 * Build and show the surface map for the formula container
 */
export function buildAndShowMap(
  container?: HTMLElement | null,
  latex?: string,
) {
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

  appState.current = { map, serializable };

  clearDomHighlight();

  // P1: Reset integer cycle state when expression changes
  resetIntegerCycleState();

  return appState.current;
}
