/**
 * AST Pattern Service
 *
 * Handles pattern-based execution using result patterns and variable bindings.
 */

import { AstNode, AstParser, AstUtils } from '../../../ast';
import { injectable } from 'tsyringe';

@injectable()
export class AstPatternService {
  constructor(
    private readonly astParser: AstParser,
    private readonly astUtils: AstUtils,
  ) {}

  /**
   * Generates a result AST from a pattern and bindings.
   *
   * @param root The root AST node
   * @param path The target path to replace
   * @param resultPattern The pattern string (e.g., "?a + ?b" or "calc(?a+?b)")
   * @param bindings Variable bindings from pattern matching
   * @returns The modified AST, or undefined if pattern application failed
   */
  generateResultFromPattern(
    root: AstNode,
    path: string,
    resultPattern: string,
    bindings: Record<string, any>,
  ): AstNode | undefined {
    // Handle calc(...) expressions
    if (resultPattern.startsWith('calc(')) {
      const expr = resultPattern.substring(5, resultPattern.length - 1);
      const val = this.evaluateCalc(expr, bindings);
      if (val === null) return undefined;

      return this.astUtils.replaceNodeAt(root, path, {
        type: 'integer',
        value: val.toString(),
      });
    }

    // Structural substitution: parse the pattern into an AST template
    const templateAst = this.astParser.parseExpression(resultPattern);
    if (!templateAst) return undefined;

    // Substitute variables in the template
    const substitutedAst = this.substituteVariables(templateAst, bindings);

    // Replace the target node with the substituted AST
    return this.astUtils.replaceNodeAt(root, path, substitutedAst);
  }

  /**
   * Evaluates a simple arithmetic expression with variable bindings.
   * Supports basic operations: +, -, *, /
   *
   * @param expr The expression string (e.g., "a+b")
   * @param bindings Variable bindings
   * @returns The computed value, or null if evaluation failed
   */
  private evaluateCalc(
    expr: string,
    bindings: Record<string, any>,
  ): number | null {
    let evalExpr = expr;

    // Replace variables with their values
    for (const [key, node] of Object.entries(bindings)) {
      if (node.type === 'integer') {
        evalExpr = evalExpr.replace(new RegExp(key, 'g'), node.value);
      } else if (node.type === 'fraction') {
        // For now, calc() only supports integers/decimals
        return null;
      }
    }

    try {
      // Safety check: only allow digits, operators, parentheses, spaces, and dots
      if (!/^[\d\+\-\*\/\(\)\s\.]+$/.test(evalExpr)) return null;

      // Use Function constructor for evaluation (safe given the regex check)
      return new Function(`return ${evalExpr}`)();
    } catch (e) {
      return null;
    }
  }

  /**
   * Recursively substitutes variables in an AST node with bound values.
   *
   * @param node The AST node to process
   * @param bindings Variable bindings
   * @returns The substituted AST node
   */
  private substituteVariables(
    node: AstNode,
    bindings: Record<string, any>,
  ): AstNode {
    if (node.type === 'variable') {
      const binding = bindings[node.name];
      if (binding) {
        return binding;
      }
      return node; // Unbound variable (should not happen if pattern matches)
    }

    if (node.type === 'binaryOp') {
      return {
        ...node,
        left: this.substituteVariables(node.left, bindings),
        right: this.substituteVariables(node.right, bindings),
      };
    }

    if (node.type === 'fraction') {
      let num = node.numerator;
      let den = node.denominator;

      // Check if numerator/denominator are variable names
      if (bindings[num]) {
        const bound = bindings[num];
        if (bound.type === 'integer') num = bound.value;
      }
      if (bindings[den]) {
        const bound = bindings[den];
        if (bound.type === 'integer') den = bound.value;
      }

      return { ...node, numerator: num, denominator: den };
    }

    return node;
  }

  /**
   * Checks if a result pattern is a calculation expression.
   */
  isCalcPattern(pattern: string): boolean {
    return pattern.startsWith('calc(') && pattern.endsWith(')');
  }

  /**
   * Extracts the expression from a calc(...) pattern.
   */
  extractCalcExpression(pattern: string): string | null {
    if (!this.isCalcPattern(pattern)) return null;
    return pattern.substring(5, pattern.length - 1);
  }
}
