/**
 * @fileoverview Surface node data structures
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

/**
 * Represents a node in the surface map.
 */
export class SurfaceNode {
  id: string;
  kind: string;
  role: string;
  bbox: BBox;
  dom: HTMLElement;
  latexFragment: string;
  children: SurfaceNode[];
  parent: SurfaceNode | null;
  synthetic: boolean;

  // Optional properties set during correlation
  astNodeId: string | null = null;
  astOperator: string | null = null;
  astOperatorIndex: number | null = null;
  astIntegerValue: string | null = null;
  operatorIndex: number | null = null;
  meta: any = null;

  constructor({
    id,
    kind,
    role,
    bbox,
    dom,
    latexFragment,
    parent = null,
    synthetic = false,
  }: SurfaceNodeOptions) {
    this.id = id;
    this.kind = kind;
    this.role = role;
    this.bbox = bbox;
    this.dom = dom;
    this.latexFragment = latexFragment;
    this.children = [];
    this.parent = parent;
    this.synthetic = synthetic;
  }

  addChild(child: SurfaceNode) {
    this.children.push(child);
    child.parent = this;
  }

  isAtomic(): boolean {
    const atomicKinds = new Set([
      "Num",
      "Var",
      "BinaryOp",
      "Relation",
      "ParenOpen",
      "ParenClose",
      "FracBar",
    ]);
    return atomicKinds.has(this.kind);
  }

  hasText(): boolean {
    return (this.latexFragment || "").trim().length > 0;
  }

  toPlain(): any {
    return {
      id: this.id,
      kind: this.kind,
      role: this.role,
      operatorIndex:
        typeof this.operatorIndex === "number" ? this.operatorIndex : undefined,
      bbox: this.bbox,
      latexFragment: this.latexFragment,
      children: this.children.map((c) => c.toPlain()),
    };
  }
}

/**
 * Factory for creating surface nodes with auto-incrementing IDs.
 */
export class SurfaceNodeFactory {
  private idCounter = 0;

  nextId(prefix: string): string {
    return `${prefix}-${(++this.idCounter).toString(36)}`;
  }

  create(
    options: Partial<SurfaceNodeOptions> & { idPrefix?: string },
  ): SurfaceNode {
    return new SurfaceNode({
      ...options,
      id: options.id || this.nextId(options.idPrefix || "node"),
    } as SurfaceNodeOptions);
  }

  createRoot(
    containerElement: HTMLElement,
    containerBBox: { width: number; height: number },
  ): SurfaceNode {
    return new SurfaceNode({
      id: "root",
      kind: "Root",
      role: "root",
      bbox: {
        left: 0,
        top: 0,
        right: containerBBox.width,
        bottom: containerBBox.height,
      },
      dom: containerElement,
      latexFragment: "",
      parent: null,
    });
  }
}
