import type { SurfaceMapResult } from "../../surface-map/interfaces/IMapEngine";
import type { BBox, SurfaceNode } from "../../surface-map/models/SurfaceNode";
import { OperandFinder } from "../../surface-map/utils/OperandFinder";

export interface BoundingBoxItem {
  node: SurfaceNode;
  bbox: BBox;
  role: string;
}

/**
 * Class representing an operator selection context.
 */
export class OperatorSelectionContext {
  public operatorSurfaceNode: SurfaceNode;
  public leftOperandSurfaceNode: SurfaceNode | null;
  public rightOperandSurfaceNode: SurfaceNode | null;
  public astPath: string;
  public operatorSymbol: string;

  /**
   * Create an operator context from a clicked operator node.
   */
  static create(
    operatorNode: SurfaceNode,
    surfaceMap: SurfaceMapResult | null,
  ): OperatorSelectionContext | null {
    if (
      !operatorNode ||
      !(
        operatorNode.kind === "BinaryOp" ||
        operatorNode.kind === "MinusBinary" ||
        operatorNode.kind === "Op" ||
        operatorNode.role === "operator"
      )
    ) {
      return null;
    }

    if (!operatorNode.astNodeId) {
      return null;
    }

    const operands = OperandFinder.find(surfaceMap, operatorNode.astNodeId);

    if (!operands) {
      return null;
    }

    const operatorSymbol = operatorNode.latexFragment || "?";

    return new OperatorSelectionContext(
      operatorNode,
      operands.left,
      operands.right,
      operatorNode.astNodeId,
      operatorSymbol,
    );
  }

  constructor(
    operatorSurfaceNode: SurfaceNode,
    leftOperandSurfaceNode: SurfaceNode | null,
    rightOperandSurfaceNode: SurfaceNode | null,
    astPath: string,
    operatorSymbol: string,
  ) {
    this.operatorSurfaceNode = operatorSurfaceNode;
    this.leftOperandSurfaceNode = leftOperandSurfaceNode;
    this.rightOperandSurfaceNode = rightOperandSurfaceNode;
    this.astPath = astPath;
    this.operatorSymbol = operatorSymbol;
  }

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
