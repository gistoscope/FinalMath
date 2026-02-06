import { singleton } from 'tsyringe';
import { SurfaceNode } from '../../surface-map';

@singleton()
export class NodeHighlighter {
  private oldNode: SurfaceNode | null = null;

  /**
   * Clear DOM highlight from last hover node
   */
  clearDomHighlight() {
    if (this.oldNode && this.oldNode.dom) {
      this.oldNode.dom.classList.remove('math-node-hover');
    }
    this.oldNode = null;
  }

  /**
   * Apply highlight to a node
   * @param {object} node - Surface node to highlight
   */
  highlightNode(node: SurfaceNode) {
    this.clearDomHighlight();
    if (!node || !node.dom) return;
    node.dom.classList.add('math-node-hover');
    node.dom.style.cursor = 'pointer';
    this.oldNode = node;
  }

  /**
   * Get last hover node
   */
  getLastHoverNode() {
    return this.oldNode;
  }

  /**
   * Set last hover node
   */
  setLastHoverNode(node: SurfaceNode) {
    this.oldNode = node;
  }
}
