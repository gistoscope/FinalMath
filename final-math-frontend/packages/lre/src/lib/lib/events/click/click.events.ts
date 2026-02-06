import { inject, injectable } from 'tsyringe';
import { SurfaceNode } from '../../surface-map';
import { NodeHighlighter } from '../hover/node-highlighter.hover';
import { NodeClickHighlighter } from './node.click';

@injectable()
export class ClickEvents {
  constructor(
    @inject(NodeClickHighlighter)
    private readonly nodeClickHighlighter: NodeClickHighlighter,
    @inject(NodeHighlighter)
    private readonly nodeHoverHighlighter: NodeHighlighter,
  ) {}

  onClick(node: SurfaceNode) {
    this.nodeHoverHighlighter.clearDomHighlight();
    this.nodeClickHighlighter.highlight(node);
  }

  clickOutSide() {
    this.nodeHoverHighlighter.clearDomHighlight();
    this.nodeClickHighlighter.clearHighlight();
  }
}
