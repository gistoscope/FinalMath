/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, type RefObject } from "react";
import {
  appState,
  dragState,
  getCurrentLatex,
  selectionState,
} from "../app/core/state";
import {
  applyOperatorHighlight,
  clearOperatorHighlight,
} from "../app/features/selection/operator-highlight";
import { hitTestRect } from "../app/features/selection/selection-manager";
import { OperatorSelectionContext } from "../app/operator-selection-context";
import { getOperandNodes, hitTestPoint } from "../app/surface-map";
import { clearDomHighlight, highlightNode } from "../app/ui/hover-panel";
import { applySelectionVisual } from "../app/ui/selection-overlay";

// todo transform to this simple function
export function useFormulaInteraction(
  containerRef: RefObject<HTMLDivElement | null>,
  displayAdapter: any,
) {
  useEffect(() => {
    const interaction = new FormulaInteraction(containerRef, displayAdapter);
    interaction.listeners();
    return () => {
      interaction.removeListeners();
    };
  }, [containerRef, displayAdapter]);
}

// simple class
export class FormulaInteraction {
  container: HTMLDivElement;
  displayAdapter: any;
  constructor(
    containerRef: RefObject<HTMLDivElement | null>,
    displayAdapter: any,
  ) {
    if (!containerRef.current) {
      throw new Error("Container ref is not initialized");
    }
    this.container = containerRef.current;
    this.displayAdapter = displayAdapter;
  }

  listeners() {
    this.container.addEventListener("pointerdown", this.handlePointerDown);
    this.container.addEventListener("pointermove", this.handlePointerMove);
    this.container.addEventListener("pointerup", this.handlePointerUp);
    this.container.addEventListener("pointercancel", this.handlePointerCancel);
    this.container.addEventListener("pointerleave", this.handlePointerCancel);
  }

  removeListeners() {
    this.container.removeEventListener("pointerdown", this.handlePointerDown);
    this.container.removeEventListener("pointermove", this.handlePointerMove);
    this.container.removeEventListener("pointerup", this.handlePointerUp);
    this.container.removeEventListener(
      "pointercancel",
      this.handlePointerCancel,
    );
    this.container.removeEventListener(
      "pointerleave",
      this.handlePointerCancel,
    );
  }

  handlePointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    if (!appState.current || !appState.current.map) return;
    dragState.isDragging = true;
    dragState.dragStart = { x: e.clientX, y: e.clientY };
    dragState.dragEnd = { x: e.clientX, y: e.clientY };
  };

  handlePointerMove = (e: PointerEvent) => {
    if (!appState.current || !appState.current.map) return;
    const containerBox = this.container.getBoundingClientRect();

    const node = this.findNodeByElement(
      e.target as HTMLElement,
      e,
      this.container,
    );

    if (!node) {
      clearDomHighlight();
    } else {
      highlightNode(node);
    }

    this.displayAdapter.emitHover(node, e);

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
  };

  handlePointerUp = (e: PointerEvent) => {
    if (!appState.current || !appState.current.map) return;
    const map = appState.current.map;
    const containerBox = this.container.getBoundingClientRect();
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
          this.displayAdapter.emitSelectionChanged("rect", e);
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

    const node = this.findNodeByElement(
      e.target as HTMLElement,
      e,
      this.container,
    );

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
    this.displayAdapter.emitSelectionChanged("click", e);

    // SMART OPERATOR SELECTION
    if (
      node.role === "operator" ||
      node.kind === "BinaryOp" ||
      node.kind === "MinusBinary"
    ) {
      const operatorContext = OperatorSelectionContext.create(
        node,
        appState.current.map,
        getOperandNodes,
      );

      if (operatorContext && operatorContext.isComplete()) {
        const boxes = operatorContext.getBoundingBoxes();
        (window as any).__currentOperatorContext = operatorContext;

        applyOperatorHighlight(operatorContext, boxes, getCurrentLatex()).catch(
          (err) => {
            console.error("[SmartOperatorSelection] Highlight error:", err);
          },
        );
      } else {
        (window as any).__currentOperatorContext = null;
        clearOperatorHighlight();
      }
    }

    this.displayAdapter.emitClick(node, e);
  };

  handlePointerCancel = () => {
    const dragRectEl = document.getElementById("drag-rect");
    if (dragRectEl) dragRectEl.style.display = "none";
    dragState.isDragging = false;
    dragState.dragStart = null;
    dragState.dragEnd = null;
  };

  findNodeByElement(
    target: HTMLElement,
    e: PointerEvent,
    container: HTMLElement,
  ) {
    if (!appState.current || !appState.current.map) return null;

    if (e && typeof e.clientX === "number" && typeof e.clientY === "number") {
      const node = hitTestPoint(
        appState.current.map,
        e.clientX,
        e.clientY,
        container,
      );
      if (node) return node;
    }

    const byElement = (appState.current.map as any).byElement;
    if (!byElement) return null;

    let el: HTMLElement | null = target;
    while (el && el !== container && !byElement.has(el)) {
      el = el.parentElement;
    }
    return el ? byElement.get(el) : null;
  }
}
