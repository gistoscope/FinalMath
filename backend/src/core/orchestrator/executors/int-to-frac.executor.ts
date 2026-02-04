/**
 * INT_TO_FRAC Executor
 *
 * Converts an integer to a fraction with contextual denominator normalization.
 *
 * Simple case: 5 → 5/1
 * Contextual case: In "1/3 * 1 + 2/5 * 1", clicking on left "1":
 *   → Analyzes denominators (3, 5), calculates LCM (15)
 *   → Determines multiplier for left side: 5 (since 3 * 5 = 15)
 *   → Returns 5/5 instead of 1/1
 *
 * Follows SOLID:
 * - SRP: Executor only handles transformation, analysis delegated to FractionContextAnalyzer
 * - OCP: Can extend behavior by modifying analyzer without changing executor
 * - DIP: Depends on abstractions (AstUtils, FractionContextAnalyzer)
 */

import { injectable } from "tsyringe";
import type { AstNode } from "../../ast/ast.types.js";
import { AstUtils } from "../../ast/utils.ast.js";
import { FractionContextAnalyzer } from "../analyzers/fraction-context.analyzer.js";
import { ExecutionResult, PrimitiveExecutor, ValidationResult } from "./base.executor.js";

/**
 * Execution context for INT_TO_FRAC
 */
export interface IntToFracContext {
  /** Force simple conversion (1/1) without contextual analysis */
  forceSimple?: boolean;
  /** Override the denominator value */
  forceDenominator?: string;
}

/**
 * IntToFracExecutor - Converts integers to fractions with contextual awareness
 */
@injectable()
export class IntToFracExecutor implements PrimitiveExecutor {
  constructor(
    private readonly astUtils: AstUtils,
    private readonly fractionContextAnalyzer: FractionContextAnalyzer
  ) {}

  /**
   * Validate if the target is an integer node
   */
  validate(ast: AstNode, targetPath: string): ValidationResult {
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
   * Execute the INT_TO_FRAC transformation with contextual denominator normalization
   *
   * Logic Flow:
   * 1. Validate target is an integer
   * 2. Analyze surrounding context for fractions (if contextual mode)
   * 3. Calculate appropriate denominator based on LCM analysis
   * 4. Create fraction node with calculated numerator/denominator
   * 5. Replace and convert back to LaTeX
   */
  execute(ast: AstNode, targetPath: string, context?: IntToFracContext): ExecutionResult {
    // Step 1: Validate
    const validation = this.validate(ast, targetPath);
    if (!validation.ok) {
      return {
        ok: false,
        error: validation.error,
      };
    }

    const targetNode = this.astUtils.getNodeAt(ast, targetPath);
    const intValue = (targetNode as any).value;

    // Step 2 & 3: Determine denominator based on context
    let denominator: string;
    let numerator: string;

    if (context?.forceSimple) {
      // Simple mode: just use 1/1 transformation
      numerator = intValue;
      denominator = "1";
    } else if (context?.forceDenominator) {
      // Override mode: use provided denominator
      denominator = context.forceDenominator;
      numerator = this.calculateNumerator(intValue, denominator);
    } else {
      // Contextual mode: analyze surrounding fractions for LCM-based normalization
      const contextualDenom = this.fractionContextAnalyzer.getContextualDenominator(
        ast,
        targetPath
      );

      if (contextualDenom !== "1") {
        // We're in a fractional context - create identity fraction (d/d)
        // This handles cases like: 1/3 * 1 + 2/5 * 1 → 1/3 * 5/5 + 2/5 * 1
        denominator = contextualDenom;
        numerator = this.calculateNumeratorForIdentity(intValue, contextualDenom);
      } else {
        // No fractional context - simple conversion
        numerator = intValue;
        denominator = "1";
      }
    }

    // Step 4: Create fraction node
    const fractionNode = {
      type: "fraction" as const,
      numerator,
      denominator,
    };

    // Step 5: Replace and convert to LaTeX
    const newAst = this.astUtils.replaceNodeAt(ast, targetPath, fractionNode);
    const newLatex = this.astUtils.toLatex(newAst);

    return { ok: true, newLatex };
  }

  /**
   * Calculate numerator for a target denominator
   * For non-1 integers: n → n*d/d (to maintain value)
   */
  private calculateNumerator(intValue: string, denominator: string): string {
    const numericInt = parseInt(intValue, 10);
    const numericDenom = parseInt(denominator, 10);

    if (isNaN(numericInt) || isNaN(numericDenom) || numericDenom === 0) {
      return intValue;
    }

    // Integer n with denominator d: n = (n*d)/d
    return (numericInt * numericDenom).toString();
  }

  /**
   * Calculate numerator for identity fraction conversion
   * For integer "1": 1 → d/d (identity fraction that equals 1)
   * For other integers: n → (n*d)/d
   */
  private calculateNumeratorForIdentity(intValue: string, denominator: string): string {
    const numericInt = parseInt(intValue, 10);
    const numericDenom = parseInt(denominator, 10);

    if (isNaN(numericInt) || isNaN(numericDenom) || numericDenom === 0) {
      return intValue;
    }

    // For identity: if int is 1, use d/d
    // For scaling: if int is n, use (n*d)/d
    if (numericInt === 1) {
      return denominator; // 1 → d/d
    }

    return (numericInt * numericDenom).toString();
  }
}
