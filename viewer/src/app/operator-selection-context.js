/**
 * Operator Selection Context
 *
 * Creates a context object when user clicks on an operator.
 * Contains references to the operator and its operands for visual highlighting.
 */

/**
 * Class representing an operator selection context.
 * Encapsulates the operator and its operands for highlighting purposes.
 */
export class OperatorSelectionContext {
  /**
   * @param {Object} operatorSurfaceNode - The operator surface node
   * @param {Object|null} leftOperandSurfaceNode - The left operand surface node
   * @param {Object|null} rightOperandSurfaceNode - The right operand surface node
   * @param {string} astPath - The AST path of the operator
   * @param {string} operatorSymbol - The symbol representation of the operator
   */
  constructor(
    operatorSurfaceNode,
    leftOperandSurfaceNode,
    rightOperandSurfaceNode,
    astPath,
    operatorSymbol,
  ) {
    this.operatorSurfaceNode = operatorSurfaceNode;
    this.leftOperandSurfaceNode = leftOperandSurfaceNode;
    this.rightOperandSurfaceNode = rightOperandSurfaceNode;
    this.astPath = astPath;
    this.operatorSymbol = operatorSymbol;
  }

  /**
   * Create an operator context from a clicked operator node.
   * Returns the operator and its left/right operands for highlighting.
   *
   * @param {Object} operatorNode - The clicked surface node (kind === "Op")
   * @param {Object} surfaceMap - The surface map from buildSurfaceNodeMap
   * @param {Function} getOperandNodes - Function to find operand nodes by AST path
   * @returns {OperatorSelectionContext|null} Context instance or null if invalid
   */
  static create(operatorNode, surfaceMap, getOperandNodes) {
    // Validate input
    if (!operatorNode || operatorNode.kind !== "Op") {
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
    console.log(
      `[OperatorContext] Creating context for operator at path: ${operatorAstPath}`,
    );

    // Get operand nodes using the surface-map helper
    const operands = getOperandNodes(surfaceMap, operatorAstPath);

    if (!operands) {
      console.log("[OperatorContext] Could not find operands for operator");
      return null;
    }

    const operatorSymbol =
      operatorNode.latexFragment || operatorNode.text || "?";

    const context = new OperatorSelectionContext(
      operatorNode,
      operands.left,
      operands.right,
      operatorAstPath,
      operatorSymbol,
    );

    console.log("[OperatorContext] Created context:", {
      operator: operatorAstPath,
      leftPath: operands.left?.astNodeId || "not found",
      rightPath: operands.right?.astNodeId || "not found",
      leftKind: operands.left?.kind,
      rightKind: operands.right?.kind,
    });

    return context;
  }

  /**
   * Check if this context is complete (has operator and both operands).
   * @returns {boolean}
   */
  isComplete() {
    return !!(
      this.operatorSurfaceNode &&
      this.leftOperandSurfaceNode &&
      this.rightOperandSurfaceNode
    );
  }

  /**
   * Get all bounding boxes from this context for highlighting.
   * @returns {Array<{node: Object, bbox: Object, role: string}>}
   */
  getBoundingBoxes() {
    const boxes = [];

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
