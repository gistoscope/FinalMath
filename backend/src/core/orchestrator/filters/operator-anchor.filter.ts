/**
 * Operator Anchor Filter
 *
 * Anchors candidates to a specific operator node when the user clicks an operator.
 * Ensures that only transformations targeting the clicked operator are considered.
 */

import { injectable } from "tsyringe";
import { AstUtils } from "../../ast/utils.ast.js";

/**
 * Candidate interface (minimal definition for filtering)
 */
export interface Candidate {
  id: string;
  targetPath: string;
  [key: string]: any;
}

/**
 * OperatorAnchorFilter - Filters candidates to match clicked operator
 */
@injectable()
export class OperatorAnchorFilter {
  constructor(private readonly astUtils: AstUtils) {}

  /**
   * Apply operator anchoring to candidates
   *
   * @param candidates - Array of candidates to filter
   * @param ast - The AST
   * @param selectionPath - The path selected by the user
   * @param operatorIndex - Index of the clicked operator (if applicable)
   * @param resolvedSelectionPath - The resolved AST path from MapMaster
   * @returns Filtered array of candidates, or empty if anchor doesn't match
   */
  apply(
    candidates: Candidate[],
    ast: any,
    selectionPath: string | null,
    operatorIndex: number | null | undefined,
    resolvedSelectionPath: string | undefined
  ): Candidate[] {
    const operatorAnchorPath = this.getOperatorAnchorPath(
      ast,
      resolvedSelectionPath,
      selectionPath,
      operatorIndex
    );

    if (operatorAnchorPath) {
      const anchoredCandidates = candidates.filter((c) => c.targetPath === operatorAnchorPath);

      // If we have an operator anchor but no matching candidates, return empty
      // This prevents applying transformations to the wrong operator
      return anchoredCandidates;
    }

    // No operator anchor, return all candidates
    return candidates;
  }

  /**
   * Find the binary operator node that "owns" the clicked selection.
   *
   * If the user clicks on a binary operator token (e.g. "+"), the selectionPath
   * usually points to that specific token or region. We want to find the
   * AstNode of type "binaryOp" that this token belongs to.
   *
   * @param ast - The AST
   * @param selectionAstPath - The resolved AST path
   * @param selectionPath - The user's selection path
   * @param operatorIndex - Index of the clicked operator
   * @returns The path to the operator node, or null if not found
   */
  private getOperatorAnchorPath(
    ast: any,
    selectionAstPath: string | undefined,
    selectionPath: string | null,
    operatorIndex: number | undefined
  ): string | null {
    // If we have an explicit operator index, we trust the resolved path IF it's a binary op.
    if (typeof operatorIndex === "number" && selectionAstPath) {
      const node = this.astUtils.getNodeAt(ast, selectionAstPath);
      if (node && node.type === "binaryOp") {
        return selectionAstPath;
      }
    }

    // Fallback: if selectionPath explicitly targets an operator token (e.g. ends in .op)
    // This handles cases where operatorIndex might be missing but UI is specific.
    if (selectionPath && (selectionPath.endsWith(".op") || selectionPath.includes(".op."))) {
      // If selectionAstPath is defined and is binaryOp, return it.
      if (selectionAstPath) {
        const node = this.astUtils.getNodeAt(ast, selectionAstPath);
        if (node && node.type === "binaryOp") return selectionAstPath;
      }
    }

    return null;
  }
}
