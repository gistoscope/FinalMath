/**
 * Operator Selection Context
 *
 * Creates a context object when user clicks on an operator.
 * Contains references to the operator and its operands for visual highlighting.
 */

import {
  SurfaceNode,
  SurfaceNodeMap,
  getOperandNodes as getOperandNodesFunc,
} from "./surface-map";

export interface OperatorContext {
  operatorSurfaceNode: SurfaceNode;
  leftOperandSurfaceNode: SurfaceNode | null;
  rightOperandSurfaceNode: SurfaceNode | null;
  astPath: string;
  operatorSymbol: string;
}

export interface BoundingBoxContext {
  node: SurfaceNode;
  bbox: any; // Using any for bbox structure if not strictly defined in SurfaceMap yet, but assuming BBox
  role: string;
}

/**
 * Create an operator context from a clicked operator node.
 * Returns the operator and its left/right operands for highlighting.
 *
 * @param {Object} operatorNode - The clicked surface node (kind === "Op")
 * @param {Object} surfaceMap - The surface map from buildSurfaceNodeMap
 * @param {Function} getOperandNodes - Function to find operand nodes by AST path
 * @returns {Object|null} Context with { operatorSurfaceNode, leftOperandSurfaceNode, rightOperandSurfaceNode, astPath }
 */
export function createOperatorContext(
  operatorNode: SurfaceNode,
  surfaceMap: SurfaceNodeMap,
  getOperandNodes: typeof getOperandNodesFunc
): OperatorContext | null {
  // Validate input
  // Adjusted check: In surface-map, "BinaryOp" or similar is used.
  // The original check was operatorNode.kind !== "Op".
  // Assuming "Op" might be a shorthand or we should check for "BinaryOp".
  // Let's stick to what surface-map produces: "BinaryOp", "MinusBinary", "Relation".
  const isOp = ["BinaryOp", "MinusBinary", "Relation", "Op"].includes(
    operatorNode.kind
  );

  if (!operatorNode || !isOp) {
    console.log(
      "[OperatorContext] Invalid node: not an operator",
      operatorNode?.kind
    );
    return null;
  }

  if (!operatorNode.astNodeId) {
    console.log(
      "[OperatorContext] Operator has no astNodeId, cannot find operands"
    );
    return null;
  }

  const operatorAstPath = operatorNode.astNodeId;
  console.log(
    `[OperatorContext] Creating context for operator at path: ${operatorAstPath}`
  );

  // Get operand nodes using the surface-map helper
  const operands = getOperandNodes(surfaceMap, operatorAstPath);

  if (!operands) {
    console.log("[OperatorContext] Could not find operands for operator");
    return null;
  }

  const context: OperatorContext = {
    operatorSurfaceNode: operatorNode,
    leftOperandSurfaceNode: operands.left,
    rightOperandSurfaceNode: operands.right,
    astPath: operatorAstPath,
    operatorSymbol: operatorNode.latexFragment || operatorNode.text || "?",
  };

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
 * Check if an operator context is complete (has operator and both operands).
 * @param {Object|null} context - Operator context
 * @returns {boolean}
 */
export function isCompleteContext(context: OperatorContext | null): boolean {
  return !!(
    context &&
    context.operatorSurfaceNode &&
    context.leftOperandSurfaceNode &&
    context.rightOperandSurfaceNode
  );
}

/**
 * Get all bounding boxes from an operator context for highlighting.
 * @param {Object} context - Operator context
 * @returns {Array<{node: Object, bbox: Object, role: string}>}
 */
export function getContextBoundingBoxes(
  context: OperatorContext | null
): BoundingBoxContext[] {
  if (!context) return [];

  const boxes: BoundingBoxContext[] = [];

  if (context.operatorSurfaceNode?.bbox) {
    boxes.push({
      node: context.operatorSurfaceNode,
      bbox: context.operatorSurfaceNode.bbox,
      role: "operator",
    });
  }

  if (context.leftOperandSurfaceNode?.bbox) {
    boxes.push({
      node: context.leftOperandSurfaceNode,
      bbox: context.leftOperandSurfaceNode.bbox,
      role: "left-operand",
    });
  }

  if (context.rightOperandSurfaceNode?.bbox) {
    boxes.push({
      node: context.rightOperandSurfaceNode,
      bbox: context.rightOperandSurfaceNode.bbox,
      role: "right-operand",
    });
  }

  return boxes;
}
