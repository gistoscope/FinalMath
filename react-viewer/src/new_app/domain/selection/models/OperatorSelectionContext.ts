import { SurfaceNode } from "../../surface-map/models/SurfaceNode";

export interface BoundingBoxItem {
  node: SurfaceNode;
  bbox: any;
  role: string;
}

/**
 * Class representing an operator selection context.
 */
export class OperatorSelectionContext {
  constructor(
    public operatorSurfaceNode: SurfaceNode,
    public leftOperandSurfaceNode: SurfaceNode | null,
    public rightOperandSurfaceNode: SurfaceNode | null,
    public astPath: string,
    public operatorSymbol: string,
  ) {}

  public isComplete(): boolean {
    return !!(
      this.operatorSurfaceNode &&
      this.leftOperandSurfaceNode &&
      this.rightOperandSurfaceNode
    );
  }

  public getBoundingBoxes(): BoundingBoxItem[] {
    const boxes: BoundingBoxItem[] = [];

    if (this.operatorSurfaceNode?.bbox) {
      boxes.push({
        node: this.operatorSurfaceNode,
        bbox: this.operatorSurfaceNode.bbox,
        role: "operator",
      });
    }

    if (this.leftOperandSurfaceNode?.bbox) {
      boxes.push({
        node: this.leftOperandSurfaceNode,
        bbox: this.leftOperandSurfaceNode.bbox,
        role: "left-operand",
      });
    }

    if (this.rightOperandSurfaceNode?.bbox) {
      boxes.push({
        node: this.rightOperandSurfaceNode,
        bbox: this.rightOperandSurfaceNode.bbox,
        role: "right-operand",
      });
    }

    return boxes;
  }
}
