/**
 * ONE_TO_TARGET_DENOM Executor
 *
 * Converts the integer "1" to a fraction "d/d" where d is the
 * denominator of an adjacent fraction in an addition/subtraction.
 *
 * Example: 2/3 + 1 → 2/3 + 3/3
 */

import { injectable } from "tsyringe";
import { AstUtils } from "../../ast/utils.ast.js";
import { ExecutionResult, PrimitiveExecutor, ValidationResult } from "./base.executor.js";

/**
 * OneToTargetDenomExecutor - Converts 1 to matching fraction
 */
@injectable()
export class OneToTargetDenomExecutor implements PrimitiveExecutor {
  constructor(private readonly astUtils: AstUtils) {}

  /**
   * Validate if the transformation can be applied
   */
  validate(ast: any, targetPath: string): ValidationResult {
    const targetNode = this.astUtils.getNodeAt(ast, targetPath);

    // Validate target is integer "1"
    if (!targetNode || targetNode.type !== "integer" || (targetNode as any).value !== "1") {
      return {
        ok: false,
        error: `Target must be integer "1", got ${targetNode?.type}:${(targetNode as any)?.value}`,
      };
    }

    // Find parent (should be multiplication: frac * 1)
    const pathParts = targetPath.split(".");
    if (pathParts.length < 2) {
      return {
        ok: false,
        error: "Path too short to find parent",
      };
    }

    pathParts.pop();
    const parentPath = pathParts.join(".") || "root";
    const parent = this.astUtils.getNodeAt(ast, parentPath);

    if (!parent || parent.type !== "binaryOp" || parent.op !== "*") {
      return {
        ok: false,
        error: `Parent must be *, got ${parent?.type}:${(parent as any)?.op}`,
      };
    }

    // Find grandparent (should be + or -)
    pathParts.pop();
    const grandParentPath = pathParts.length > 0 ? pathParts.join(".") : "root";
    const grandParent =
      grandParentPath === "root" ? ast : this.astUtils.getNodeAt(ast, grandParentPath);

    if (
      !grandParent ||
      grandParent.type !== "binaryOp" ||
      (grandParent.op !== "+" && grandParent.op !== "-")
    ) {
      return {
        ok: false,
        error: `Grandparent must be +/-, got ${grandParent?.type}:${(grandParent as any)?.op}`,
      };
    }

    return { ok: true };
  }

  /**
   * Execute the ONE_TO_TARGET_DENOM transformation
   */
  execute(ast: any, targetPath: string, _context?: any): ExecutionResult {
    // Validate first
    const validation = this.validate(ast, targetPath);
    if (!validation.ok) {
      return {
        ok: false,
        error: validation.error,
      };
    }

    // Find parent and grandparent
    const pathParts = targetPath.split(".");
    pathParts.pop();
    const parentPath = pathParts.join(".") || "root";
    const parent = this.astUtils.getNodeAt(ast, parentPath);

    pathParts.pop();
    const grandParentPath = pathParts.length > 0 ? pathParts.join(".") : "root";
    const grandParent =
      grandParentPath === "root" ? ast : this.astUtils.getNodeAt(ast, grandParentPath);

    // Determine which side we're on and find opposite branch
    const parentIsLeft = parent === grandParent.left;
    const otherBranch = parentIsLeft ? grandParent.right : grandParent.left;

    // Extract denominator from other branch
    const oppositeD = this.extractDenominator(otherBranch);
    if (!oppositeD) {
      return {
        ok: false,
        error: "Could not find opposite denominator",
      };
    }

    // Replace "1" with fraction d/d
    const newFraction = {
      type: "fraction" as const,
      numerator: oppositeD,
      denominator: oppositeD,
    };

    const newAst = this.astUtils.replaceNodeAt(ast, targetPath, newFraction);
    const newLatex = this.astUtils.toLatex(newAst);

    return { ok: true, newLatex };
  }

  /**
   * Extract denominator from a node (handles multiplication and direct fractions)
   */
  private extractDenominator(node: any): string | undefined {
    if (node.type === "binaryOp" && node.op === "*") {
      if (node.left.type === "fraction") return node.left.denominator;
      if (node.right.type === "fraction") return node.right.denominator;
    }
    if (node.type === "fraction") return node.denominator;
    return undefined;
  }
}
