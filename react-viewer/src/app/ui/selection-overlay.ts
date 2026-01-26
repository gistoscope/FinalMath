// ui/selection-overlay.ts
// Selection overlay and visual highlighting

import { selectionState } from "../core/state";

let selectionOverlayEl: HTMLElement | null = null;

/**
 * Ensure selection overlay exists and return it
 */
export function ensureSelectionOverlay(): HTMLElement | null {
  const shell = document.querySelector(".formula-shell");
  if (!shell) return null;

  if (!selectionOverlayEl) {
    selectionOverlayEl = document.createElement("div");
    selectionOverlayEl.id = "selection-overlay";
    selectionOverlayEl.style.position = "absolute";
    selectionOverlayEl.style.left = "0px";
    selectionOverlayEl.style.top = "0px";
    selectionOverlayEl.style.right = "0px";
    selectionOverlayEl.style.bottom = "0px";
    selectionOverlayEl.style.pointerEvents = "none";
    selectionOverlayEl.style.zIndex = "2";
    shell.appendChild(selectionOverlayEl);

    const dragRectEl = document.getElementById("drag-rect");
    if (dragRectEl) dragRectEl.style.zIndex = "3";
  }

  return selectionOverlayEl;
}

/**
 * Clear selection visual overlay
 */
export function clearSelectionVisual(map?: any) {
  if (map && map.atoms) {
    for (const node of map.atoms) {
      if (node.dom && node.dom.classList) {
        node.dom.classList.remove("mv-selected");
      }
    }
  }

  const overlay = ensureSelectionOverlay();
  if (!overlay) return;
  overlay.innerHTML = "";
}

/**
 * Get text for visual display
 */
export function nodeTextForVisual(node: any): string {
  const t = (
    node && node.latexFragment ? String(node.latexFragment) : ""
  ).trim();
  return t;
}

/**
 * Check if node should be skipped for visual display
 */
export function shouldSkipNodeForVisual(node: any): boolean {
  if (!node) return true;
  if (node.kind === "FracBar") return true;
  const t = nodeTextForVisual(node);
  if (!t) return true;
  if (!t.replace(/\s+/g, "")) return true;
  return false;
}

/**
 * Build selected leaf nodes for visual display
 */
export function buildSelectedLeafNodes(map: any): any[] {
  const selectedSet = selectionState.selectedIds;
  const selectedById = new Map();
  for (const n of map?.atoms || []) {
    if (selectedSet.has(n.id)) selectedById.set(n.id, n);
  }

  const memo = new Map();
  function hasSelectedDescendant(node: any): boolean {
    if (!node || !node.children || node.children.length === 0) return false;
    if (memo.has(node.id)) return memo.get(node.id);

    for (const ch of node.children) {
      if (selectedSet.has(ch.id)) {
        memo.set(node.id, true);
        return true;
      }
      if (hasSelectedDescendant(ch)) {
        memo.set(node.id, true);
        return true;
      }
    }
    memo.set(node.id, false);
    return false;
  }

  const leaf = [];
  for (const node of selectedById.values()) {
    if (!hasSelectedDescendant(node)) leaf.push(node);
  }
  return leaf;
}

/**
 * Cluster adjacent digit runs for visual display
 */
export function clusterDigitRuns(nodes: any[]): any[] {
  const digits = [];
  const rest = [];

  for (const n of nodes) {
    const t = nodeTextForVisual(n);
    if (n.kind === "Num" && /^[0-9]$/.test(t)) digits.push(n);
    else rest.push(n);
  }

  digits.sort((a, b) => a.bbox.left - b.bbox.left);

  const merged = [];
  let cur: any = null;

  function midY(n: any): number {
    return (n.bbox.top + n.bbox.bottom) / 2;
  }

  for (const n of digits) {
    if (!cur) {
      cur = {
        kind: "Num",
        text: nodeTextForVisual(n),
        bbox: { ...n.bbox },
      };
      continue;
    }

    const sameLine =
      Math.abs(midY(n) - (cur.bbox.top + cur.bbox.bottom) / 2) <= 3;
    const gap = n.bbox.left - cur.bbox.right;

    if (sameLine && gap <= 2) {
      cur.text += nodeTextForVisual(n);
      cur.bbox.right = Math.max(cur.bbox.right, n.bbox.right);
      cur.bbox.top = Math.min(cur.bbox.top, n.bbox.top);
      cur.bbox.bottom = Math.max(cur.bbox.bottom, n.bbox.bottom);
    } else {
      merged.push(cur);
      cur = {
        kind: "Num",
        text: nodeTextForVisual(n),
        bbox: { ...n.bbox },
      };
    }
  }
  if (cur) merged.push(cur);

  const items: any[] = [];
  for (const m of merged)
    items.push({ kind: m.kind, text: m.text, bbox: m.bbox });
  for (const r of rest)
    items.push({ kind: r.kind, text: nodeTextForVisual(r), bbox: r.bbox });

  items.sort((a, b) => a.bbox.left - b.bbox.left);

  return items;
}

/**
 * Paint selection rectangles on overlay
 */
export function paintSelectionRects(items: any[], colorMode = "default") {
  const overlay = ensureSelectionOverlay();
  if (!overlay) return;
  overlay.innerHTML = "";

  const colorSchemes: Record<string, any> = {
    default: {
      border: "2px solid rgba(16, 185, 129, 0.95)",
      boxShadow: "0 0 0 2px rgba(16, 185, 129, 0.3)",
      background: "rgba(209, 250, 229, 0.4)",
    },
    direct: {
      border: "2px solid rgba(34, 197, 94, 0.95)",
      boxShadow: "0 0 0 3px rgba(34, 197, 94, 0.3)",
      background: "rgba(187, 247, 208, 0.5)",
    },
    "requires-prep": {
      border: "2px solid rgba(234, 179, 8, 0.95)",
      boxShadow: "0 0 0 3px rgba(234, 179, 8, 0.3)",
      background: "rgba(254, 243, 199, 0.5)",
    },
  };

  const scheme = colorSchemes[colorMode] || colorSchemes.default;

  for (const it of items) {
    const w = Math.max(0, it.bbox.right - it.bbox.left);
    const h = Math.max(0, it.bbox.bottom - it.bbox.top);
    if (w < 2 || h < 2) continue;

    const r = document.createElement("div");
    r.style.position = "absolute";
    r.style.left = it.bbox.left + "px";
    r.style.top = it.bbox.top + "px";
    r.style.width = w + "px";
    r.style.height = h + "px";

    r.style.border = scheme.border;
    r.style.boxShadow = scheme.boxShadow;
    r.style.backgroundColor = scheme.background;
    r.style.borderRadius = "2px";

    if (it.role) {
      r.dataset.role = it.role;
    }

    overlay.appendChild(r);
  }
}

/**
 * Apply selection visual to map
 */
export function applySelectionVisual(map: any) {
  if (!map || !map.atoms) return;

  clearSelectionVisual(map);

  const leafSelected = buildSelectedLeafNodes(map);
  const visible = leafSelected.filter((n) => !shouldSkipNodeForVisual(n));
  const items = clusterDigitRuns(visible);

  paintSelectionRects(items);
}
