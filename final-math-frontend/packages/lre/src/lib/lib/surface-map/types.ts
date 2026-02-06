export type SurfaceNodeKind =
  | 'Num'
  | 'Var'
  | 'BinaryOp'
  | 'MinusBinary'
  | 'MinusUnary'
  | 'Relation'
  | 'ParenOpen'
  | 'ParenClose'
  | 'FracBar'
  | 'Fraction'
  | 'Decimal'
  | 'MixedNumber'
  | 'Root'
  | 'Other';

export interface BBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface SurfaceNode {
  id: string;
  kind: SurfaceNodeKind;
  role: string; // 'operand' | 'operator' | 'decorator' | 'root' | 'group'
  bbox: BBox;
  dom: HTMLElement | null; // null for synthetic nodes
  latexFragment: string;
  children: SurfaceNode[];
  parent: SurfaceNode | null;
  synthetic: boolean;

  // Methods
  addChild(child: SurfaceNode): void;
  isAtomic(): boolean;
  hasText(): boolean;
  toPlain(): object;

  // Annotated properties (post-enhancement)
  astNodeId?: string;
  astOperator?: string;
  astIntegerValue?: string;
  astOperatorIndex?: number;
  operatorIndex?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: Record<string, any>;
}

export interface SurfaceMap {
  root: SurfaceNode;
  atoms: SurfaceNode[];
  byElement: Map<HTMLElement, SurfaceNode>;
}

export interface NodeInfo {
  kind: SurfaceNodeKind;
  role: string;
  idPrefix: string;
  atomic: boolean;
}

export interface Segment {
  type: string;
  text: string;
}
