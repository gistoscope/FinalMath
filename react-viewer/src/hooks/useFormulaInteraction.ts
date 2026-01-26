import { useEffect, type RefObject } from "react";
import {
  appState,
  dragState,
  getCurrentLatex,
  selectionState,
} from "../app/core/state.js";
import {
  applyOperatorHighlight,
  clearOperatorHighlight,
} from "../app/features/selection/operator-highlight.js";
import { hitTestRect } from "../app/features/selection/selection-manager.js";
import { OperatorSelectionContext } from "../app/operator-selection-context.js";
import { hitTestPoint } from "../app/surface-map";
import { getOperandNodes } from "../app/surface-map.js";
import {
  clearDomHighlight,
  formatNodeInfo,
  highlightNode,
} from "../app/ui/hover-panel.js";
import { applySelectionVisual } from "../app/ui/selection-overlay.js";
import { useViewer } from "../context/ViewerContext";

/**
 * Find node by element using hit testing
 * @param {HTMLElement} target - Target element
 * @param {PointerEvent} e - Pointer event
 * @param {HTMLElement} container - Formula container
 * @returns {object|null} Surface node or null
 */
function findNodeByElement(
  target: HTMLElement,
  e: PointerEvent,
  container: HTMLElement,
) {
  if (!(appState as any).current || !(appState as any).current.map) return null;

  if (e && typeof e.clientX === "number" && typeof e.clientY === "number") {
    const node = hitTestPoint(
      (appState as any).current.map,
      e.clientX,
      e.clientY,
      container,
    );
    if (node) return node;
  }

  if (!(appState as any).current.map.byElement) return null;
  let el: HTMLElement | null = target;
  while (
    el &&
    el !== container &&
    !(appState as any).current.map.byElement.has(el)
  ) {
    el = el.parentElement;
  }
  return el ? (appState as any).current.map.byElement.get(el) : null;
}

export function useFormulaInteraction(
  containerRef: RefObject<HTMLDivElement | null>,
  displayAdapter: any,
) {
  const { dispatch } = useViewer();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (!(appState as any).current || !(appState as any).current.map) return;
      (dragState as any).isDragging = true;
      (dragState as any).dragStart = { x: e.clientX, y: e.clientY };
      (dragState as any).dragEnd = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!(appState as any).current || !(appState as any).current.map) return;
      const containerBox = container.getBoundingClientRect();

      const node = findNodeByElement(e.target as HTMLElement, e, container);

      if (!node) {
        clearDomHighlight();
        dispatch({ type: "UPDATE_HOVER", payload: { target: "—" } });
      } else {
        highlightNode(node);
        dispatch({
          type: "UPDATE_HOVER",
          payload: { target: formatNodeInfo(node) },
        });
      }

      displayAdapter.emitHover(node, e);

      if ((dragState as any).isDragging && (dragState as any).dragStart) {
        (dragState as any).dragEnd = { x: e.clientX, y: e.clientY };
        const dragRectEl = document.getElementById("drag-rect");
        if (dragRectEl) {
          const left =
            Math.min(
              (dragState as any).dragStart.x,
              (dragState as any).dragEnd.x,
            ) - containerBox.left;
          const top =
            Math.min(
              (dragState as any).dragStart.y,
              (dragState as any).dragEnd.y,
            ) - containerBox.top;
          const width = Math.abs(
            (dragState as any).dragEnd.x - (dragState as any).dragStart.x,
          );
          const height = Math.abs(
            (dragState as any).dragEnd.y - (dragState as any).dragStart.y,
          );
          dragRectEl.style.display = "block";
          dragRectEl.style.left = left + "px";
          dragRectEl.style.top = top + "px";
          dragRectEl.style.width = width + "px";
          dragRectEl.style.height = height + "px";
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!(appState as any).current || !(appState as any).current.map) return;
      const map = (appState as any).current.map;
      const containerBox = container.getBoundingClientRect();
      const dragRectEl = document.getElementById("drag-rect");

      if ((dragState as any).isDragging && (dragState as any).dragStart) {
        const dx = e.clientX - (dragState as any).dragStart.x;
        const dy = e.clientY - (dragState as any).dragStart.y;
        const dist2 = dx * dx + dy * dy;
        const threshold2 = 7 * 7;

        if (dist2 > threshold2) {
          const rect = {
            left:
              Math.min((dragState as any).dragStart.x, e.clientX) -
              containerBox.left,
            right:
              Math.max((dragState as any).dragStart.x, e.clientX) -
              containerBox.left,
            top:
              Math.min((dragState as any).dragStart.y, e.clientY) -
              containerBox.top,
            bottom:
              Math.max((dragState as any).dragStart.y, e.clientY) -
              containerBox.top,
          };

          const nodesInRect = hitTestRect(map, rect);

          if (nodesInRect.length > 0) {
            if (e.ctrlKey) {
              const newSet = new Set((selectionState as any).selectedIds);
              for (const n of nodesInRect) {
                if (newSet.has(n.id)) newSet.delete(n.id);
                else newSet.add(n.id);
              }
              (selectionState as any).selectedIds = newSet;
              (selectionState as any).mode =
                newSet.size <= 1 ? "single" : "multi";
              (selectionState as any).primaryId =
                nodesInRect[nodesInRect.length - 1].id;
            } else {
              (selectionState as any).selectedIds = new Set(
                nodesInRect.map((n) => n.id),
              );
              (selectionState as any).mode = "rect";
              (selectionState as any).primaryId =
                nodesInRect[nodesInRect.length - 1].id;
            }
            applySelectionVisual(map);
            displayAdapter.emitSelectionChanged("rect", e);
          }

          if (dragRectEl) dragRectEl.style.display = "none";
          (dragState as any).isDragging = false;
          (dragState as any).dragStart = null;
          (dragState as any).dragEnd = null;
          return;
        }
      }

      if (dragRectEl) dragRectEl.style.display = "none";
      (dragState as any).isDragging = false;
      (dragState as any).dragStart = null;
      (dragState as any).dragEnd = null;

      if (e.button !== 0) return;

      const node = findNodeByElement(e.target as HTMLElement, e, container);

      if (!node) return;

      if (e.ctrlKey) {
        const newSet = new Set((selectionState as any).selectedIds);
        if (newSet.has(node.id)) {
          newSet.delete(node.id);
        } else {
          newSet.add(node.id);
        }
        (selectionState as any).selectedIds = newSet;
        (selectionState as any).mode =
          newSet.size === 0 ? "none" : newSet.size === 1 ? "single" : "multi";
        (selectionState as any).primaryId = newSet.size ? node.id : null;
      } else {
        (selectionState as any).selectedIds = new Set([node.id]);
        (selectionState as any).mode = "single";
        (selectionState as any).primaryId = node.id;
      }
      applySelectionVisual(map);
      displayAdapter.emitSelectionChanged("click", e);

      dispatch({
        type: "UPDATE_HOVER",
        payload: { lastClick: formatNodeInfo(node) },
      });

      // SMART OPERATOR SELECTION
      if (
        node.role === "operator" ||
        node.kind === "BinaryOp" ||
        node.kind === "MinusBinary"
      ) {
        const operatorContext = OperatorSelectionContext.create(
          node,
          (appState as any).current.map,
          getOperandNodes,
        );

        if (operatorContext && operatorContext.isComplete()) {
          const boxes = operatorContext.getBoundingBoxes();
          (window as any).__currentOperatorContext = operatorContext;

          applyOperatorHighlight(
            operatorContext,
            boxes,
            getCurrentLatex(),
          ).catch((err) => {
            console.error("[SmartOperatorSelection] Highlight error:", err);
          });
        } else {
          (window as any).__currentOperatorContext = null;
          clearOperatorHighlight();
        }
      }

      displayAdapter.emitClick(node, e);
    };

    const handlePointerCancel = () => {
      const dragRectEl = document.getElementById("drag-rect");
      if (dragRectEl) dragRectEl.style.display = "none";
      dragState.isDragging = false;
      dragState.dragStart = null;
      dragState.dragEnd = null;
    };

    container.addEventListener("pointerdown", handlePointerDown as any);
    container.addEventListener("pointermove", handlePointerMove as any);
    container.addEventListener("pointerup", handlePointerUp as any);
    container.addEventListener("pointercancel", handlePointerCancel);
    container.addEventListener("pointerleave", handlePointerCancel);

    return () => {
      container.removeEventListener("pointerdown", handlePointerDown as any);
      container.removeEventListener("pointermove", handlePointerMove as any);
      container.removeEventListener("pointerup", handlePointerUp as any);
      container.removeEventListener("pointercancel", handlePointerCancel);
      container.removeEventListener("pointerleave", handlePointerCancel);
    };
  }, [containerRef, displayAdapter]);
}
