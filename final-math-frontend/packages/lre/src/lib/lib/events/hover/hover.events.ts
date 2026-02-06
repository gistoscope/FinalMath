import { inject, injectable } from 'tsyringe';
import { SurfaceNode } from '../../surface-map';
import { NodeHighlighter } from './node-highlighter.hover';

@injectable()
export class HoverEvents {
  constructor(
    @inject(NodeHighlighter) private readonly nodeHighlighter: NodeHighlighter,
  ) {}

  onHover(node: SurfaceNode) {
    this.nodeHighlighter.highlightNode(node);
  }

  hoverOutSide() {
    this.nodeHighlighter.clearDomHighlight();
  }
}
