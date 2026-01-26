// ui/hover-panel.ts
// Hover panel utility functions

import { SurfaceNode } from "../surface-map/surface-node";

let lastHoverNode: SurfaceNode | null = null;

/**
 * Format node info for UI
 */
export function formatNodeInfo(node: SurfaceNode | null): string {
  if (!node) return "—";
  const text = node.latexFragment ? ` "${node.latexFragment}"` : "";
  return `${node.id} · ${node.kind}${text}`;
}

/**
 * Clear DOM highlight from last hover node
 */
export function clearDomHighlight() {
  if (lastHoverNode && lastHoverNode.dom) {
    lastHoverNode.dom.style.outline = "";
    lastHoverNode.dom.style.backgroundColor = "";
  }
  lastHoverNode = null;
}

/**
 * Apply highlight to a node
 */
export function highlightNode(node: SurfaceNode | null) {
  if (node === lastHoverNode) return;
  clearDomHighlight();
  if (!node || !node.dom) return;

  node.dom.style.outline = "2px solid rgba(37,99,235,0.8)";
  node.dom.style.backgroundColor = "rgba(191,219,254,0.45)";
  lastHoverNode = node;
}

/**
 * Get last hover node
 */
export function getLastHoverNode(): SurfaceNode | null {
  return lastHoverNode;
}

/**
 * Set last hover node
 */
export function setLastHoverNode(node: SurfaceNode | null) {
  lastHoverNode = node;
}
