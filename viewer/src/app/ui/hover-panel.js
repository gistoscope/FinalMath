// ui/hover-panel.js
// Hover and click info panel UI

let lastHoverNode = null;

/**
 * Update hover/click panel with node info
 * @param {string} kind - "hover" or "click"
 * @param {object|null} node - Surface node
 */
export function updateHoverPanel(kind, node) {
  const hoverSpan = document.getElementById("hover-info");
  const clickSpan = document.getElementById("click-info");

  if (kind === "hover") {
    if (!hoverSpan) return;
    if (!node) {
      hoverSpan.textContent = "—";
      return;
    }
    const text = node.latexFragment ? ` "${node.latexFragment}"` : "";
    hoverSpan.textContent = `${node.id} · ${node.kind}${text}`;
  } else if (kind === "click") {
    if (!clickSpan) return;
    if (!node) {
      clickSpan.textContent = "—";
      return;
    }
    const text = node.latexFragment ? ` "${node.latexFragment}"` : "";
    clickSpan.textContent = `${node.id} · ${node.kind}${text}`;
  }
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
 * @param {object} node - Surface node to highlight
 */
export function highlightNode(node) {
  clearDomHighlight();
  if (!node || !node.dom) return;
  // Hover highlight (blue outline)
  node.dom.style.outline = "2px solid rgba(37,99,235,0.8)";
  node.dom.style.backgroundColor = "rgba(191,219,254,0.45)";
  lastHoverNode = node;
}

/**
 * Get last hover node
 */
export function getLastHoverNode() {
  return lastHoverNode;
}

/**
 * Set last hover node
 */
export function setLastHoverNode(node) {
  lastHoverNode = node;
}
