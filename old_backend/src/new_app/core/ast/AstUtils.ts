/**
 * AstUtils Class
 *
 * Utility functions for AST manipulation.
 *
 * Responsibilities:
 *  - Navigate AST nodes by path
 *  - Replace nodes at paths
 *  - Convert AST back to LaTeX
 */

import type { AstNode, BinaryOpNode } from "./ast.types.js";

/**
 * AstUtils - AST manipulation utilities
 */
export class AstUtils {
  /**
   * Get a node at a specific path.
   * Path format: "root", "term[0]", "term[1].term[0]", etc.
   */
  static getNodeAt(ast: AstNode, path: string): AstNode | undefined {
    if (!ast || !path) return undefined;

    if (path === "root") return ast;

    const parts = path.split(".");
    let current: AstNode | undefined = ast;

    for (const part of parts) {
      if (!current) return undefined;

      const match = part.match(/^term\[(\d+)\]$/);
      if (match && current.type === "binaryOp") {
        const index = parseInt(match[1], 10);
        current = index === 0 ? current.left : current.right;
      } else if (part === "child" && current.type === "group") {
        current = current.child;
      } else if (part === "operand" && current.type === "unaryOp") {
        current = current.operand;
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Replace a node at a specific path.
   * Returns a new AST with the replacement (immutable).
   */
  static replaceNodeAt(
    ast: AstNode,
    path: string,
    replacement: AstNode,
  ): AstNode {
    if (path === "root") {
      return { ...replacement };
    }

    return this.replaceRecursive(ast, path.split("."), replacement);
  }

  private static replaceRecursive(
    node: AstNode,
    pathParts: string[],
    replacement: AstNode,
  ): AstNode {
    if (pathParts.length === 0) {
      return { ...replacement };
    }

    const [current, ...rest] = pathParts;
    const match = current.match(/^term\[(\d+)\]$/);

    if (match && node.type === "binaryOp") {
      const index = parseInt(match[1], 10);
      const newNode = { ...node } as BinaryOpNode;

      if (index === 0) {
        newNode.left = this.replaceRecursive(node.left, rest, replacement);
      } else {
        newNode.right = this.replaceRecursive(node.right, rest, replacement);
      }

      return newNode;
    }

    if (current === "child" && node.type === "group") {
      return {
        ...node,
        child: this.replaceRecursive(node.child, rest, replacement),
      };
    }

    if (current === "operand" && node.type === "unaryOp") {
      return {
        ...node,
        operand: this.replaceRecursive(node.operand, rest, replacement),
      };
    }

    // Path doesn't match, return unchanged
    return node;
  }

  /**
   * Convert an AST node back to LaTeX.
   */
  static toLatex(node: AstNode): string {
    switch (node.type) {
      case "integer":
        return node.value;

      case "fraction":
        return `\\frac{${node.numerator}}{${node.denominator}}`;

      case "mixed":
        return `${node.whole}\\frac{${node.numerator}}{${node.denominator}}`;

      case "variable":
        return node.name;

      case "binaryOp": {
        const left = this.toLatex(node.left);
        const right = this.toLatex(node.right);
        const op = node.op === "*" ? " \\times " : ` ${node.op} `;
        return `${left}${op}${right}`;
      }

      case "unaryOp":
        return `${node.op}${this.toLatex(node.operand)}`;

      case "group":
        return `(${this.toLatex(node.child)})`;

      default:
        return "";
    }
  }

  /**
   * Augment AST with ID properties for node tracking.
   */
  static augmentWithIds(root: AstNode): AstNode {
    const clone = JSON.parse(JSON.stringify(root)) as AstNode;
    this.assignIds(clone, "root");
    return clone;
  }

  private static assignIds(
    node: AstNode & { id?: string },
    path: string,
  ): void {
    node.id = path;

    if (node.type === "binaryOp") {
      const leftPath = path === "root" ? "term[0]" : `${path}.term[0]`;
      const rightPath = path === "root" ? "term[1]" : `${path}.term[1]`;
      this.assignIds(node.left, leftPath);
      this.assignIds(node.right, rightPath);
    } else if (node.type === "group") {
      this.assignIds(node.child, `${path}.child`);
    } else if (node.type === "unaryOp") {
      this.assignIds(node.operand, `${path}.operand`);
    }
  }
}

// Backward compatibility functions
export function getNodeAt(ast: AstNode, path: string): AstNode | undefined {
  return AstUtils.getNodeAt(ast, path);
}

export function replaceNodeAt(
  ast: AstNode,
  path: string,
  replacement: AstNode,
): AstNode {
  return AstUtils.replaceNodeAt(ast, path, replacement);
}

export function toLatex(node: AstNode): string {
  return AstUtils.toLatex(node);
}
