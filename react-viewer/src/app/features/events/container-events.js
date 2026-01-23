// features/events/container-events.js
// Container event handlers (pointer events, drag selection)

import {
  appState,
  dragState,
  getCurrentLatex,
  selectionState,
} from "../../core/state.js";
import { OperatorSelectionContext } from "../../operator-selection-context.js";
import { getOperandNodes } from "../../surface-map.js";
import {
  clearDomHighlight,
  highlightNode,
  updateHoverPanel,
} from "../../ui/hover-panel.js";
import { applySelectionVisual } from "../../ui/selection-overlay.js";
import {
  applyOperatorHighlight,
  clearOperatorHighlight,
} from "../selection/operator-highlight.js";
import { hitTestRect } from "../selection/selection-manager.js";

/**
 * Find node by element using hit testing
 * @param {HTMLElement} target - Target element
 * @param {PointerEvent} e - Pointer event
 * @param {HTMLElement} container - Formula container
 * @returns {object|null} Surface node or null
 */
export function findNodeByElement(target, e, container) {
  if (!appState.current || !appState.current.map) return null;

  if (e && typeof e.clientX === "number" && typeof e.clientY === "number") {
    const { hitTestPoint: htp } = window.__surfaceMapUtils || {};
    if (htp) {
      const node = htp(appState.current.map, e.clientX, e.clientY, container);
      if (node) return node;
    }
  }

  if (!appState.current.map.byElement) return null;
  let el = target;
  while (el && el !== container && !appState.current.map.byElement.has(el)) {
    el = el.parentElement;
  }
  return el ? appState.current.map.byElement.get(el) : null;
}

/**
 * Setup container event handlers
 * @param {HTMLElement} container - Formula container
 * @param {object} displayAdapter - Display adapter instance
 */
export function setupContainerEvents(container, displayAdapter) {
  if (!container) return;

  // PointerDown: start drag-selection
  container.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (!appState.current || !appState.current.map) return;
    dragState.isDragging = true;
    dragState.dragStart = { x: e.clientX, y: e.clientY };
    dragState.dragEnd = { x: e.clientX, y: e.clientY };
  });

  // Hover
  container.addEventListener("pointermove", (e) => {
    if (!appState.current || !appState.current.map) return;
    const containerBox = container.getBoundingClientRect();

    const node = findNodeByElement(e.target, e, container);

    if (!node) {
      clearDomHighlight();
      updateHoverPanel("hover", null);
    } else {
      highlightNode(node);
      updateHoverPanel("hover", node);
    }

    displayAdapter.emitHover(node, e);

    if (dragState.isDragging && dragState.dragStart) {
      dragState.dragEnd = { x: e.clientX, y: e.clientY };
      const dragRectEl = document.getElementById("drag-rect");
      if (dragRectEl) {
        const left =
          Math.min(dragState.dragStart.x, dragState.dragEnd.x) -
          containerBox.left;
        const top =
          Math.min(dragState.dragStart.y, dragState.dragEnd.y) -
          containerBox.top;
        const width = Math.abs(dragState.dragEnd.x - dragState.dragStart.x);
        const height = Math.abs(dragState.dragEnd.y - dragState.dragStart.y);
        dragRectEl.style.display = "block";
        dragRectEl.style.left = left + "px";
        dragRectEl.style.top = top + "px";
        dragRectEl.style.width = width + "px";
        dragRectEl.style.height = height + "px";
      }
    }
  });

  // Click
  container.addEventListener("pointerup", (e) => {
    if (!appState.current || !appState.current.map) return;
    const map = appState.current.map;
    const containerBox = container.getBoundingClientRect();
    const dragRectEl = document.getElementById("drag-rect");

    if (dragState.isDragging && dragState.dragStart) {
      const dx = e.clientX - dragState.dragStart.x;
      const dy = e.clientY - dragState.dragStart.y;
      const dist2 = dx * dx + dy * dy;
      const threshold2 = 7 * 7;

      if (dist2 > threshold2) {
        const rect = {
          left: Math.min(dragState.dragStart.x, e.clientX) - containerBox.left,
          right: Math.max(dragState.dragStart.x, e.clientX) - containerBox.left,
          top: Math.min(dragState.dragStart.y, e.clientY) - containerBox.top,
          bottom: Math.max(dragState.dragStart.y, e.clientY) - containerBox.top,
        };

        const nodesInRect = hitTestRect(map, rect);

        if (nodesInRect.length > 0) {
          if (e.ctrlKey) {
            const newSet = new Set(selectionState.selectedIds);
            for (const n of nodesInRect) {
              if (newSet.has(n.id)) newSet.delete(n.id);
              else newSet.add(n.id);
            }
            selectionState.selectedIds = newSet;
            selectionState.mode = newSet.size <= 1 ? "single" : "multi";
            selectionState.primaryId = nodesInRect[nodesInRect.length - 1].id;
          } else {
            selectionState.selectedIds = new Set(nodesInRect.map((n) => n.id));
            selectionState.mode = "rect";
            selectionState.primaryId = nodesInRect[nodesInRect.length - 1].id;
          }
          applySelectionVisual(map);
          displayAdapter.emitSelectionChanged("rect", e);
        }

        if (dragRectEl) dragRectEl.style.display = "none";
        dragState.isDragging = false;
        dragState.dragStart = null;
        dragState.dragEnd = null;
        return;
      }
    }

    if (dragRectEl) dragRectEl.style.display = "none";
    dragState.isDragging = false;
    dragState.dragStart = null;
    dragState.dragEnd = null;

    if (e.button !== 0) return;

    const node = findNodeByElement(e.target, e, container);

    console.log("[DEBUG] pointerup target:", e.target, "found node:", node);
    const elDbgClientLocal = document.getElementById("engine-debug-client");
    if (elDbgClientLocal) {
      elDbgClientLocal.textContent = `Click attempt: ${node ? node.id : "null"} on ${e.target.tagName}`;
    }

    if (!node) return;

    if (e.ctrlKey) {
      const newSet = new Set(selectionState.selectedIds);
      if (newSet.has(node.id)) {
        newSet.delete(node.id);
      } else {
        newSet.add(node.id);
      }
      selectionState.selectedIds = newSet;
      selectionState.mode =
        newSet.size === 0 ? "none" : newSet.size === 1 ? "single" : "multi";
      selectionState.primaryId = newSet.size ? node.id : null;
    } else {
      selectionState.selectedIds = new Set([node.id]);
      selectionState.mode = "single";
      selectionState.primaryId = node.id;
    }
    applySelectionVisual(map);
    displayAdapter.emitSelectionChanged("click", e);

    updateHoverPanel("click", node);
    console.log("[click] SurfaceNode:", {
      id: node.id,
      kind: node.kind,
      role: node.role,
      latex: node.latexFragment,
      bbox: node.bbox,
      selectionMode: selectionState.mode,
      selectionCount: selectionState.selectedIds.size,
    });

    // SMART OPERATOR SELECTION
    if (
      node.role === "operator" ||
      node.kind === "BinaryOp" ||
      node.kind === "MinusBinary"
    ) {
      console.log(
        "[SmartOperatorSelection] Operator click detected:",
        node.kind,
        node.latexFragment,
      );

      const operatorContext = OperatorSelectionContext.create(
        node,
        appState.current.map,
        getOperandNodes,
      );

      if (operatorContext && operatorContext.isComplete()) {
        const boxes = operatorContext.getBoundingBoxes();
        console.log("[SmartOperatorSelection] Context created successfully:", {
          operator: operatorContext.operatorSymbol,
          astPath: operatorContext.astPath,
          leftOperand: operatorContext.leftOperandSurfaceNode?.latexFragment,
          rightOperand: operatorContext.rightOperandSurfaceNode?.latexFragment,
          boundingBoxCount: boxes.length,
        });

        window.__currentOperatorContext = operatorContext;

        applyOperatorHighlight(operatorContext, boxes, getCurrentLatex())
          .then((validationType) => {
            console.log(
              "[SmartOperatorSelection] Applied highlight with validationType:",
              validationType,
            );
          })
          .catch((err) => {
            console.error("[SmartOperatorSelection] Highlight error:", err);
          });
      } else {
        console.log(
          "[SmartOperatorSelection] Context incomplete - operands not found",
        );
        window.__currentOperatorContext = null;
        clearOperatorHighlight();
      }
    }

    displayAdapter.emitClick(node, e);
  });

  container.addEventListener("pointercancel", () => {
    const dragRectEl = document.getElementById("drag-rect");
    if (dragRectEl) dragRectEl.style.display = "none";
    dragState.isDragging = false;
    dragState.dragStart = null;
    dragState.dragEnd = null;
  });

  container.addEventListener("pointerleave", () => {
    const dragRectEl = document.getElementById("drag-rect");
    if (dragRectEl) dragRectEl.style.display = "none";
    dragState.isDragging = false;
    dragState.dragStart = null;
    dragState.dragEnd = null;
  });
}
