/**
 * Operator Selection Context
 */

import { SurfaceNode } from "./surface-map/surface-node";

interface OperandNodes {
  left: SurfaceNode | null;
  right: SurfaceNode | null;
}

export interface BoundingBoxItem {
  node: SurfaceNode;
  bbox: any;
  role: string;
}

/**
 * Class representing an operator selection context.
 * Encapsulates the operator and its operands for highlighting purposes.
 */
export class OperatorSelectionContext {
  operatorSurfaceNode: SurfaceNode;
  leftOperandSurfaceNode: SurfaceNode | null;
  rightOperandSurfaceNode: SurfaceNode | null;
  astPath: string;
  operatorSymbol: string;

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

  /**
   * Create an operator context from a clicked operator node.
   */
  static create(
    operatorNode: SurfaceNode,
    surfaceMap: { atoms: SurfaceNode[] },
    getOperandNodes: (map: any, path: string) => OperandNodes | null,
  ): OperatorSelectionContext | null {
    if (
      !operatorNode ||
      (operatorNode.kind !== "Op" && operatorNode.kind !== "BinaryOp")
    ) {
      console.log(
        "[OperatorContext] Invalid node: not an operator",
        operatorNode?.kind,
      );
      return null;
    }

    if (!operatorNode.astNodeId) {
      console.log(
        "[OperatorContext] Operator has no astNodeId, cannot find operands",
      );
      return null;
    }

    const operatorAstPath = operatorNode.astNodeId;
    const operands = getOperandNodes(surfaceMap, operatorAstPath);

    if (!operands) {
      console.log("[OperatorContext] Could not find operands for operator");
      return null;
    }

    const operatorSymbol =
      operatorNode.latexFragment || (operatorNode as any).text || "?";

    const context = new OperatorSelectionContext(
      operatorNode,
      operands.left,
      operands.right,
      operatorAstPath,
      operatorSymbol,
    );

    return context;
  }

  /**
   * Check if this context is complete.
   */
  isComplete(): boolean {
    return !!(
      this.operatorSurfaceNode &&
      this.leftOperandSurfaceNode &&
      this.rightOperandSurfaceNode
    );
  }

  /**
   * Get all bounding boxes from this context for highlighting.
   */
  getBoundingBoxes(): BoundingBoxItem[] {
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
