/**
 * @fileoverview Operand finder for Smart Operator Selection
 * Finds operand surface nodes for a given operator AST path.
 */

import { SurfaceNode } from "./surface-node";

/**
 * Class for finding operand nodes in a surface map.
 */
export class OperandFinder {
  /**
   * Find operand surface nodes for a given operator AST path.
   * Used by Smart Operator Selection to find visual elements for highlighting.
   *
   * @param surfaceMap - Surface map with atoms array
   * @param operatorAstPath - AST path of the operator (e.g., "root", "term[1]")
   * @returns \{left: SurfaceNode|null, right: SurfaceNode|null\}|null
   */
  static find(
    surfaceMap: { atoms: SurfaceNode[] },
    operatorAstPath: string,
  ): { left: SurfaceNode | null; right: SurfaceNode | null } | null {
    if (!surfaceMap || !Array.isArray(surfaceMap.atoms) || !operatorAstPath) {
      return null;
    }

    // Compute child paths
    let leftPath: string, rightPath: string;

    if (operatorAstPath === "root") {
      leftPath = "term[0]";
      rightPath = "term[1]";
    } else {
      leftPath = `${operatorAstPath}.term[0]`;
      rightPath = `${operatorAstPath}.term[1]`;
    }

    console.log(
      `[getOperandNodes] Looking for operands: left="${leftPath}", right="${rightPath}"`,
    );

    let leftNode: SurfaceNode | null = null;
    let rightNode: SurfaceNode | null = null;

    // Strategy 1: Exact match on astNodeId
    for (const atom of surfaceMap.atoms) {
      if (!atom.astNodeId) continue;

      if (
        atom.astNodeId === leftPath ||
        atom.astNodeId.startsWith(leftPath + ".")
      ) {
        if (atom.astNodeId === leftPath || !leftNode) {
          leftNode = atom;
        }
      }
      if (
        atom.astNodeId === rightPath ||
        atom.astNodeId.startsWith(rightPath + ".")
      ) {
        if (atom.astNodeId === rightPath || !rightNode) {
          rightNode = atom;
        }
      }
    }

    // Strategy 2: Find by position relative to operator
    if (!leftNode || !rightNode) {
      const operatorNode = surfaceMap.atoms.find(
        (a) => a.astNodeId === operatorAstPath,
      );

      if (operatorNode && operatorNode.bbox) {
        const opCenter = (operatorNode.bbox.left + operatorNode.bbox.right) / 2;
        const opMidY = (operatorNode.bbox.top + operatorNode.bbox.bottom) / 2;

        const operandCandidates = surfaceMap.atoms.filter((a) => {
          if (a === operatorNode) return false;
          if (!a.bbox) return false;

          const isOperand =
            a.kind === "Num" ||
            a.kind === "Var" ||
            a.kind === "Fraction" ||
            a.kind === "Decimal" ||
            a.kind === "MixedNumber";
          if (!isOperand) return false;

          const aMidY = (a.bbox.top + a.bbox.bottom) / 2;
          const vertOverlap = Math.abs(aMidY - opMidY) < 20;

          return vertOverlap;
        });

        if (!leftNode) {
          const leftCandidates = operandCandidates.filter(
            (a) => a.bbox!.right <= opCenter,
          );
          if (leftCandidates.length > 0) {
            leftNode = leftCandidates.sort(
              (a, b) => b.bbox!.right - a.bbox!.right,
            )[0];
          }
        }

        if (!rightNode) {
          const rightCandidates = operandCandidates.filter(
            (a) => a.bbox!.left >= opCenter,
          );
          if (rightCandidates.length > 0) {
            rightNode = rightCandidates.sort(
              (a, b) => a.bbox!.left - b.bbox!.left,
            )[0];
          }
        }
      }
    }

    console.log(
      `[getOperandNodes] Found: left=${leftNode?.id || "null"} (${leftNode?.kind}), right=${rightNode?.id || "null"} (${rightNode?.kind})`,
    );

    return {
      left: leftNode,
      right: rightNode,
    };
  }
}

/**
 * Find operand surface nodes for a given operator AST path.
 * @param surfaceMap - Surface map
 * @param operatorAstPath - AST path
 * @returns \{left: SurfaceNode|null, right: SurfaceNode|null\}|null
 */
export function getOperandNodes(
  surfaceMap: { atoms: SurfaceNode[] },
  operatorAstPath: string,
): { left: SurfaceNode | null; right: SurfaceNode | null } | null {
  return OperandFinder.find(surfaceMap, operatorAstPath);
}
