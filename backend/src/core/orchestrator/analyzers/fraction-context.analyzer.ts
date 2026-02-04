/**
 * Fraction Context Analyzer
 *
 * Service responsible for analyzing the context around a node
 * to determine appropriate denominator normalization strategies.
 *
 * Follows SRP: Only handles contextual analysis, not transformation.
 */

import { injectable } from "tsyringe";
import type { AstNode, BinaryOpNode, FractionNode } from "../../ast/ast.types.js";
import { AstUtils } from "../../ast/utils.ast.js";
import { lcmMultiple } from "../../math/math.utils.js";

/**
 * Result of fraction context analysis
 */
export interface FractionContext {
  /** All denominators found in the current scope */
  denominators: number[];
  /** Calculated LCM of all denominators */
  lcm: number;
  /** The multiplier needed for the target node to reach LCM */
  targetMultiplier: number;
  /** Whether adjacent terms have different denominators */
  requiresNormalization: boolean;
  /** Whether denominators are already equal */
  denominatorsEqual: boolean;
  /** The side (left/right) where the target node is located */
  targetSide: "left" | "right" | null;
  /** Path to the parent addition/subtraction node */
  parentAddSubPath: string | null;
}

/**
 * FractionContextAnalyzer - Analyzes fractional context for denominator normalization
 */
@injectable()
export class FractionContextAnalyzer {
  constructor(private readonly astUtils: AstUtils) {}

  /**
   * Analyze the context around a target node to determine LCM-based normalization
   *
   * @param ast - The full AST
   * @param targetPath - Path to the target node (the integer to convert)
   * @returns FractionContext with all relevant information
   */
  analyzeContext(ast: AstNode, targetPath: string): FractionContext {
    const defaultContext: FractionContext = {
      denominators: [],
      lcm: 1,
      targetMultiplier: 1,
      requiresNormalization: false,
      denominatorsEqual: true,
      targetSide: null,
      parentAddSubPath: null,
    };

    // Find the nearest parent that is an addition or subtraction
    const addSubContext = this.findNearestAddSub(ast, targetPath);
    if (!addSubContext) {
      return defaultContext;
    }

    const { parentNode, parentPath, targetSide } = addSubContext;

    // Extract denominators from both sides
    const leftDenoms = this.extractDenominators(parentNode.left);
    const rightDenoms = this.extractDenominators(parentNode.right);
    const allDenoms = [...leftDenoms, ...rightDenoms];

    if (allDenoms.length === 0) {
      return defaultContext;
    }

    // Calculate LCM
    const calculatedLcm = lcmMultiple(allDenoms);

    // Check if denominators are already equal
    const uniqueDenoms = [...new Set(allDenoms)];
    const denominatorsEqual = uniqueDenoms.length === 1;

    // Calculate target multiplier (what fraction the "1" should become)
    // For expression like 1/3 * 1 + 2/5 * 1, when clicking on left "1":
    // LCM(3,5) = 15, so 1 → 5/5 (since 3 * 5 = 15)
    const oppositeDenoms = targetSide === "left" ? rightDenoms : leftDenoms;
    const targetMultiplier = oppositeDenoms.length > 0 ? oppositeDenoms[0] : calculatedLcm;

    return {
      denominators: allDenoms,
      lcm: calculatedLcm,
      targetMultiplier,
      requiresNormalization: !denominatorsEqual && allDenoms.length > 1,
      denominatorsEqual,
      targetSide,
      parentAddSubPath: parentPath,
    };
  }

  /**
   * Find the nearest parent addition or subtraction node
   */
  private findNearestAddSub(
    ast: AstNode,
    targetPath: string
  ): { parentNode: BinaryOpNode; parentPath: string; targetSide: "left" | "right" } | null {
    const pathParts = targetPath.split(".");

    // Walk up the tree looking for + or - operator
    while (pathParts.length > 0) {
      const lastPart = pathParts.pop();
      const currentPath = pathParts.length > 0 ? pathParts.join(".") : "root";
      const currentNode = currentPath === "root" ? ast : this.astUtils.getNodeAt(ast, currentPath);

      if (
        currentNode &&
        currentNode.type === "binaryOp" &&
        (currentNode.op === "+" || currentNode.op === "-")
      ) {
        // Determine which side the target was on
        const targetSide =
          lastPart?.includes("term[0]") || lastPart?.includes("left") ? "left" : "right";

        return {
          parentNode: currentNode as BinaryOpNode,
          parentPath: currentPath,
          targetSide,
        };
      }
    }

    return null;
  }

  /**
   * Extract all denominators from a node (recursive)
   * Handles: fractions, fraction * integer, nested structures
   */
  private extractDenominators(node: AstNode): number[] {
    if (!node) return [];

    switch (node.type) {
      case "fraction":
        const denom = parseInt((node as FractionNode).denominator, 10);
        return isNaN(denom) ? [] : [denom];

      case "binaryOp": {
        const binaryNode = node as BinaryOpNode;
        // For multiplication like (1/3 * 1), extract from the fraction side
        if (binaryNode.op === "*") {
          const leftDenoms = this.extractDenominators(binaryNode.left);
          const rightDenoms = this.extractDenominators(binaryNode.right);
          return [...leftDenoms, ...rightDenoms];
        }
        // For + or -, extract from both sides
        if (binaryNode.op === "+" || binaryNode.op === "-") {
          const leftDenoms = this.extractDenominators(binaryNode.left);
          const rightDenoms = this.extractDenominators(binaryNode.right);
          return [...leftDenoms, ...rightDenoms];
        }
        return [];
      }

      case "integer":
        // Integers don't have denominators
        return [];

      default:
        return [];
    }
  }

  /**
   * Get the denominator that the target integer should match
   * Based on contextual LCM analysis
   *
   * @param ast - The full AST
   * @param targetPath - Path to the integer node
   * @returns The appropriate denominator value as string, or "1" if no context
   */
  getContextualDenominator(ast: AstNode, targetPath: string): string {
    const context = this.analyzeContext(ast, targetPath);

    if (!context.requiresNormalization) {
      // No normalization needed - either no fractions or denominators are equal
      if (context.denominators.length > 0 && context.denominatorsEqual) {
        return context.denominators[0].toString();
      }
      return "1";
    }

    // Return the multiplier that will help reach the common denominator
    return context.targetMultiplier.toString();
  }
}
