/**
 * AstParser Class
 *
 * Parses LaTeX expressions into AST.
 *
 * Responsibilities:
 *  - Parse LaTeX strings into AST nodes
 *  - Handle various mathematical expressions
 */

import type { AstNode } from "./ast.types.js";

/**
 * AstParser - Parses LaTeX expressions into AST
 */
export class AstParser {
  /**
   * Parse a LaTeX expression into an AST.
   */
  static parse(latex: string): AstNode | undefined {
    const parser = new AstParser();
    return parser.parseExpression(latex);
  }

  /**
   * Parse an expression.
   */
  parseExpression(latex: string): AstNode | undefined {
    if (!latex || latex.trim() === "") {
      return undefined;
    }

    try {
      // Simple parser for basic expressions
      return this.parseAdditive(latex.trim());
    } catch {
      return undefined;
    }
  }

  private parseAdditive(expr: string): AstNode | undefined {
    // Find + or - at the top level (not inside brackets)
    const parts = this.splitAtTopLevel(expr, ["+", "-"]);

    if (parts.length === 1) {
      return this.parseMultiplicative(expr);
    }

    // Build left-associative tree
    let left = this.parseMultiplicative(parts[0].value);
    if (!left) return undefined;

    for (let i = 1; i < parts.length; i++) {
      const right = this.parseMultiplicative(parts[i].value);
      if (!right) return undefined;

      left = {
        type: "binaryOp",
        op: parts[i].op as "+" | "-",
        left,
        right,
      };
    }

    return left;
  }

  private parseMultiplicative(expr: string): AstNode | undefined {
    const parts = this.splitAtTopLevel(expr, ["*", "\\times", "\\cdot"]);

    if (parts.length === 1) {
      return this.parsePrimary(expr);
    }

    let left = this.parsePrimary(parts[0].value);
    if (!left) return undefined;

    for (let i = 1; i < parts.length; i++) {
      const right = this.parsePrimary(parts[i].value);
      if (!right) return undefined;

      left = {
        type: "binaryOp",
        op: "*",
        left,
        right,
      };
    }

    return left;
  }

  private parsePrimary(expr: string): AstNode | undefined {
    expr = expr.trim();

    // Handle fractions
    if (expr.startsWith("\\frac{")) {
      return this.parseFraction(expr);
    }

    // Handle parentheses
    if (expr.startsWith("(") && expr.endsWith(")")) {
      const inner = expr.slice(1, -1);
      const child = this.parseExpression(inner);
      if (child) {
        return { type: "group", child };
      }
    }

    // Handle integers
    if (/^-?\d+$/.test(expr)) {
      return { type: "integer", value: expr };
    }

    // Handle variables
    if (/^[a-zA-Z]$/.test(expr)) {
      return { type: "variable", name: expr };
    }

    return undefined;
  }

  private parseFraction(expr: string): AstNode | undefined {
    // Parse \frac{num}{denom}
    const match = expr.match(/^\\frac\{([^{}]+)\}\{([^{}]+)\}$/);
    if (match) {
      return {
        type: "fraction",
        numerator: match[1],
        denominator: match[2],
      };
    }
    return undefined;
  }

  private splitAtTopLevel(
    expr: string,
    operators: string[],
  ): Array<{ value: string; op: string }> {
    const result: Array<{ value: string; op: string }> = [];
    let current = "";
    let depth = 0;
    let i = 0;

    const checkOperator = (): { found: boolean; op: string; len: number } => {
      for (const op of operators) {
        if (expr.slice(i).startsWith(op)) {
          return { found: true, op, len: op.length };
        }
      }
      return { found: false, op: "", len: 0 };
    };

    while (i < expr.length) {
      const char = expr[i];

      if (char === "{" || char === "(") {
        depth++;
        current += char;
        i++;
      } else if (char === "}" || char === ")") {
        depth--;
        current += char;
        i++;
      } else if (depth === 0) {
        const opCheck = checkOperator();
        if (opCheck.found) {
          if (current.trim()) {
            result.push({
              value: current.trim(),
              op: result.length === 0 ? "" : opCheck.op,
            });
          }
          current = "";
          i += opCheck.len;
          // Mark next segment with this operator
          if (result.length > 0 || current) {
            result.push({ value: "", op: opCheck.op });
          }
        } else {
          current += char;
          i++;
        }
      } else {
        current += char;
        i++;
      }
    }

    if (current.trim()) {
      result.push({
        value: current.trim(),
        op: "",
      });
    }

    // Merge consecutive entries
    return result.filter((r) => r.value !== "");
  }
}

/**
 * Standalone function for backward compatibility
 */
export function parseExpression(latex: string): AstNode | undefined {
  return AstParser.parse(latex);
}
