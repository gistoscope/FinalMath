/**
 * INT_TO_FRAC Executor
 *
 * Converts an integer to a fraction with denominator 1.
 * Example: 5 → 5/1
 */

import { injectable } from "tsyringe";
import { AstUtils } from "../../ast/utils.ast.js";
import { ExecutionResult, PrimitiveExecutor, ValidationResult } from "./base.executor.js";

/**
 * IntToFracExecutor - Converts integers to fractions
 */
@injectable()
export class IntToFracExecutor implements PrimitiveExecutor {
  constructor(private readonly astUtils: AstUtils) {}

  /**
   * Validate if the target is an integer node
   */
  validate(ast: any, targetPath: string): ValidationResult {
    const targetNode = this.astUtils.getNodeAt(ast, targetPath);

    if (!targetNode || targetNode.type !== "integer") {
      return {
        ok: false,
        error: `Target is not integer, got ${targetNode?.type || "null"}`,
      };
    }

    return { ok: true };
  }

  /**
   * Execute the INT_TO_FRAC transformation
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

    const targetNode = this.astUtils.getNodeAt(ast, targetPath);
    const intValue = (targetNode as any).value;

    // Create fraction node
    const fractionNode = {
      type: "fraction" as const,
      numerator: intValue,
      denominator: "1",
    };

    // Replace and convert to LaTeX
    const newAst = this.astUtils.replaceNodeAt(ast, targetPath, fractionNode);
    const newLatex = this.astUtils.toLatex(newAst);

    return { ok: true, newLatex };
  }
}
