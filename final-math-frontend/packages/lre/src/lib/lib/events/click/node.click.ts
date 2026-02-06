import { singleton } from 'tsyringe';
import { SurfaceNode } from '../../surface-map';

@singleton()
export class NodeClickHighlighter {
  private oldNode: SurfaceNode | null = null;

  /**
   * Clear DOM highlight from last hover node
   */
  clearHighlight() {
    if (this.oldNode && this.oldNode.dom) {
      this.oldNode.dom.classList.remove('math-node-selected');
    }
    this.oldNode = null;
  }

  /**
   * Apply highlight to a node
   * @param {object} node - Surface node to highlight
   */
  highlight(node: SurfaceNode) {
    this.clearHighlight();
    if (!node || !node.dom) return;
    node.dom.classList.add('math-node-selected');
    this.oldNode = node;
  }

  get hasNode() {
    return !!this.oldNode;
  }

  /**
   * Get last   node
   */
  getLastNode() {
    return this.oldNode;
  }
}
