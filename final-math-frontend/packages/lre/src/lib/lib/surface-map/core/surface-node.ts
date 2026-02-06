import { BBox, SurfaceNode as ISurfaceNode, SurfaceNodeKind } from '../types';

/**
 * Represents a node in the surface map.
 * In the new architecture, this class acts primarily as a data holder
 * but implements helper methods for convenience.
 */
export class SurfaceNode implements ISurfaceNode {
  id: string;
  kind: SurfaceNodeKind;
  role: string;
  bbox: BBox;
  dom: HTMLElement | null;
  latexFragment: string;
  children: SurfaceNode[] = [];
  parent: SurfaceNode | null;
  synthetic: boolean;

  // Annotated properties
  astNodeId?: string;
  astOperator?: string;
  astIntegerValue?: string;
  astOperatorIndex?: number;
  operatorIndex?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: Record<string, any>;

  constructor(options: {
    id: string;
    kind: SurfaceNodeKind;
    role: string;
    bbox: BBox;
    dom: HTMLElement | null;
    latexFragment: string;
    parent?: SurfaceNode | null;
    synthetic?: boolean;
  }) {
    this.id = options.id;
    this.kind = options.kind;
    this.role = options.role;
    this.bbox = options.bbox;
    this.dom = options.dom;
    this.latexFragment = options.latexFragment;
    this.parent = options.parent || null;
    this.synthetic = options.synthetic || false;
  }

  /**
   * Add a child node.
   * @param child - Child node to add
   */
  addChild(child: SurfaceNode): void {
    this.children.push(child);
    child.parent = this;
  }

  /**
   * Check if this node is atomic (interactive).
   * @returns boolean
   */
  isAtomic(): boolean {
    const atomicKinds = new Set<string>([
      'Num',
      'Var',
      'BinaryOp',
      'Relation',
      'ParenOpen',
      'ParenClose',
      'FracBar',
    ]);
    return atomicKinds.has(this.kind);
  }

  /**
   * Check if this node has meaningful text.
   * @returns boolean
   */
  hasText(): boolean {
    return (this.latexFragment || '').trim().length > 0;
  }

  /**
   * Convert to a plain object for serialization.
   * @returns Object
   */
  toPlain(): object {
    return {
      id: this.id,
      kind: this.kind,
      role: this.role,
      operatorIndex: this.operatorIndex,
      bbox: this.bbox,
      latexFragment: this.latexFragment,
      // Avoid infinite recursion by not serializing parent or full children recursively here
      // if using this for debugging. Use the Serializer service for full tree ops.
      childCount: this.children.length,
    };
  }
}
