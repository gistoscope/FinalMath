/**
 * SurfaceNode.ts
 * Data structures for representing mathematical symbols in the DOM.
 */

export interface BBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface SurfaceNodeOptions {
  id: string;
  kind: string;
  role: string;
  bbox: BBox;
  dom: HTMLElement;
  latexFragment: string;
  parent?: SurfaceNode | null;
  synthetic?: boolean;
}

export class SurfaceNode {
  id: string;
  kind: string;
  role: string;
  bbox: BBox;
  dom: HTMLElement;
  latexFragment: string;
  children: SurfaceNode[] = [];
  parent: SurfaceNode | null;
  synthetic: boolean;

  // Metadata injected later
  astNodeId: string | null = null;
  astOperator: string | null = null;
  astOperatorIndex: number | null = null;
  astIntegerValue: string | null = null;
  operatorIndex: number | null = null;

  constructor(options: SurfaceNodeOptions) {
    this.id = options.id;
    this.kind = options.kind;
    this.role = options.role;
    this.bbox = options.bbox;
    this.dom = options.dom;
    this.latexFragment = options.latexFragment;
    this.parent = options.parent || null;
    this.synthetic = options.synthetic || false;
  }

  addChild(child: SurfaceNode) {
    this.children.push(child);
    child.parent = this;
  }
}
