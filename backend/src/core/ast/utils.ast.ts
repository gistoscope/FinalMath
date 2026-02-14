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

import { injectable } from "tsyringe";
import type { AstNode, FractionNode, IntegerNode } from "./ast.types";

/**
 * AstUtils - AST manipulation utilities
 */
@injectable()
export class AstUtils {
  /**
   * Get a node at a specific path.
   * Path format: "root", "term[0]", "term[1].term[0]", etc.
   */
  getNodeAt(ast: AstNode, path: string): AstNode | undefined {
    if (path === "root" || path === "") return ast;

    const parts = path.split(".");
    let current: AstNode = ast;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part === "root" || part === "") continue;

      // Handle fraction .num/.den virtual paths
      if (part === "num" || part === "den") {
        if (current.type !== "fraction") {
          return undefined; // .num/.den only valid on fraction nodes
        }
        const frac = current as FractionNode;
        const childValue = part === "num" ? frac.numerator : frac.denominator;

        // Check if the child is a simple integer string
        if (/^-?\d+$/.test(childValue)) {
          // Return a synthetic IntegerNode representing this fraction child
          return { type: "integer", value: childValue } as IntegerNode;
        }
        // Child is not a simple integer (could be an expression) - not targetable this way
        return undefined;
      }

      // Handle binaryOp term[0]/term[1]
      if (current.type === "binaryOp") {
        if (part === "term[0]") {
          current = current.left;
        } else if (part === "term[1]") {
          current = current.right;
        } else {
          return undefined;
        }
      } else if (current.type === "unaryOp") {
        if (part === "argument") {
          current = current.argument;
        } else {
          return undefined;
        }
      } else if (current.type === "mixed") {
        return undefined;
      } else if (current.type === "fraction") {
        // Fraction without .num/.den - can only navigate via term[] if parent was binaryOp
        return undefined;
      } else {
        // integer or variable - can't navigate further
        return undefined;
      }
    }

    return current;
  }

  /**
   * Replace a node at a specific path.
   * Returns a new AST with the replacement (immutable).
   */
  replaceNodeAt(ast: AstNode, path: string, newNode: AstNode): AstNode {
    if (path === "root" || path === "") return newNode;

    const parts = path.split(".");

    const _this = this;

    function update(node: AstNode, parts: string[]): AstNode {
      if (parts.length === 0) return newNode;

      const part = parts[0];
      // Handle empty parts from split if any (e.g. "term[0]..term[1]")
      if (part === "") return update(node, parts.slice(1));

      const remaining = parts.slice(1);

      // Handle fraction .num/.den virtual paths
      if (part === "num" || part === "den") {
        if (node.type !== "fraction") {
          console.warn(`[replaceNodeAt] Cannot apply .${part} to non-fraction node`);
          return node;
        }
        // For fraction children, we convert the string to the new node
        // The new node should be a fraction when applying INT_TO_FRAC
        // We need to convert it to a latex string for the fraction child
        const frac = node as FractionNode;
        if (remaining.length === 0) {
          // Replace the child - convert newNode back to LaTeX for the fraction child
          const childLatex = _this.toLatex(newNode);
          if (part === "num") {
            return { ...frac, numerator: childLatex };
          } else {
            return { ...frac, denominator: childLatex };
          }
        }
        // Nested path into .num/.den - not supported
        return node;
      }

      if (node.type === "binaryOp") {
        if (part === "term[0]") {
          return { ...node, left: update(node.left, remaining) };
        } else if (part === "term[1]") {
          return { ...node, right: update(node.right, remaining) };
        }
      } else if (node.type === "unaryOp") {
        if (part === "argument") {
          return { ...node, argument: update(node.argument, remaining) };
        }
      }
      return node;
    }

    return update(
      ast,
      parts.filter((p) => p !== "root" && p !== "")
    );
  }

  /**
   * Convert an AST node back to LaTeX.
   */
  toLatex(node: AstNode): string {
    if (node.type === "integer") {
      return node.value;
    }
    if (node.type === "fraction") {
      return `\\frac{${node.numerator}}{${node.denominator}}`;
    }
    if (node.type === "mixed") {
      return `${node.whole} \\frac{${node.numerator}}{${node.denominator}}`;
    }
    if (node.type === "unaryOp") {
      const arg = this.toLatex(node.argument);
      // unary minus has high precedence, almost always binds tightest except for power/func.
      // But if argument is binaryOp (+/-), need parens.
      // -(a+b)
      const needsParen =
        node.argument.type === "binaryOp" && (node.argument.op === "+" || node.argument.op === "-");
      return `${node.op}${needsParen ? `(${arg})` : arg}`;
    }
    if (node.type === "binaryOp") {
      if (node.op === "/") {
        return `\\frac{${this.toLatex(node.left)}}{${this.toLatex(node.right)}}`;
      }

      const left = this.toLatex(node.left);
      const right = this.toLatex(node.right);

      const leftParen = this.shouldParen(node.op, node.left, false);
      const rightParen = this.shouldParen(node.op, node.right, true);

      const lStr = leftParen ? `(${left})` : left;
      const rStr = rightParen ? `(${right})` : right;

      // Convert * to \cdot for proper LaTeX rendering
      const opLatex = node.op === "*" ? "\\cdot" : node.op;
      return `${lStr} ${opLatex} ${rStr}`;
    }
    if (node.type === "variable") {
      return node.name;
    }
    return "";
  }
  shouldParen(parentOp: string, child: AstNode, isRightChild: boolean): boolean {
    if (child.type === "unaryOp") return false; // Unary usually doesn't need paren as child of binary, e.g. a + -b

    if (child.type !== "binaryOp") return false;
    const childOp = child.op;

    const prec = (op: string) => {
      if (op === "*" || op === "/" || op === "\\div") return 2;
      if (op === "+" || op === "-") return 1;
      return 0;
    };

    const pPrec = prec(parentOp);
    const cPrec = prec(childOp);

    if (cPrec < pPrec) return true;

    if (cPrec === pPrec) {
      if (isRightChild) {
        if (parentOp === "-" || parentOp === "/") return true;
      }
      return false;
    }
    return false;
  }

  /**
   * Find a node by its operator index (visual left-to-right order).
   *
   * IMPORTANT: Only counts binaryOp nodes as operators.
   * Fractions and mixed numbers are NOT counted - they are operands, not operators.
   *
   * For expression: \frac{1}{3} \cdot \frac{5}{5} + \frac{2}{5} \cdot \frac{3}{3}
   * - Index 0: first \cdot (term[0])
   * - Index 1: + (root)
   * - Index 2: second \cdot (term[1])
   */
  getNodeByOperatorIndex(
    ast: AstNode,
    targetIndex: number
  ): { node: AstNode; path: string } | undefined {
    let currentIndex = 0;
    let found: { node: AstNode; path: string } | undefined;

    function traverse(node: AstNode, path: string) {
      if (found) return;

      // Only binaryOp nodes are counted as operators
      if (node.type === "binaryOp") {
        // In-order traversal: left subtree first (to get left-to-right visual order)
        traverse(node.left, path === "root" ? "term[0]" : `${path}.term[0]`);
        if (found) return;

        // Then count this operator
        if (currentIndex === targetIndex) {
          found = { node, path };
          return;
        }
        currentIndex++;

        // Then right subtree
        traverse(node.right, path === "root" ? "term[1]" : `${path}.term[1]`);
        return;
      }

      // Assume unaryOp is NOT counted as "operator" in this context (usually visual binary slots)
      // If we want to support click targets on unary minus, we should add it.
      // Current primitive table has clickTargetKind: "operator" for some sign ops.
      // So we PROBABLY want to count it if it's visually an operator.
      // But let's check P.INT_SUB types.

      if (node.type === "unaryOp") {
        // Count unary op?
        // For now, let's behave like it's an operator if we want it clickable.
        // Traversal order: op is first (prefix)? Or we just visit argument?
        // Usually visual order for -x is -, then x.

        // If we count it:
        if (currentIndex === targetIndex) {
          found = { node, path };
          return;
        }
        currentIndex++;
        traverse(node.argument, path === "root" ? "argument" : `${path}.argument`);
        return;
      }

      // Fractions and mixed numbers are NOT operators - don't count them
      // They are leaf nodes (operands) for the purpose of operator indexing
      // integers and variables are also NOT operators
    }

    traverse(ast, "root");
    return found;
  }
  toInstrumentedLatex(ast: AstNode, path: string = "root"): string {
    const escapeId = (id: string) => id.replace(/[\[\]{}\\]/g, "");

    const wrapNumber = (value: string, nodeId: string) => {
      const escaped = escapeId(nodeId);
      return `\\htmlData{ast-id=${escaped}, role=number}{${value}}`;
    };

    const wrapOperator = (op: string, nodeId: string) => {
      const escaped = escapeId(nodeId);
      const latexOp = op === "*" ? "\\cdot" : op;
      return `\\htmlData{ast-id=${escaped}, role=operator, operator=${op}}{${latexOp}}`;
    };

    const wrapFraction = (numLatex: string, denLatex: string, nodeId: string) => {
      const escaped = escapeId(nodeId);
      return `\\htmlData{ast-id=${escaped}, role=fraction}{\\frac{${numLatex}}{${denLatex}}}`;
    };

    if (ast.type === "integer") {
      return wrapNumber(ast.value, path);
    }

    if (ast.type === "unaryOp") {
      const arg = this.toInstrumentedLatex(ast.argument, `${path}.argument`);
      const op = wrapOperator(ast.op, path);
      // Parens logic same as toLatex
      const needsParen =
        ast.argument.type === "binaryOp" && (ast.argument.op === "+" || ast.argument.op === "-");

      return `${op}${needsParen ? `(${arg})` : arg}`;
    }

    if (ast.type === "fraction") {
      // Wrap numerator and denominator as numbers
      const numPath = `${path}.num`;
      const denPath = `${path}.den`;
      const num = wrapNumber(ast.numerator, numPath);
      const den = wrapNumber(ast.denominator, denPath);
      return wrapFraction(num, den, path);
    }

    if (ast.type === "mixed") {
      const wholePath = `${path}.whole`;
      const numPath = `${path}.num`;
      const denPath = `${path}.den`;
      const whole = wrapNumber(ast.whole, wholePath);
      const num = wrapNumber(ast.numerator, numPath);
      const den = wrapNumber(ast.denominator, denPath);
      return `${whole} ${wrapFraction(num, den, path)}`;
    }

    if (ast.type === "binaryOp") {
      const leftPath = path === "root" ? "term[0]" : `${path}.term[0]`;
      const rightPath = path === "root" ? "term[1]" : `${path}.term[1]`;

      if (ast.op === "/") {
        // Treat as fraction
        const num = this.toInstrumentedLatex(ast.left, leftPath);
        const den = this.toInstrumentedLatex(ast.right, rightPath);
        return wrapFraction(num, den, path);
      }

      const left = this.toInstrumentedLatex(ast.left, leftPath);
      const right = this.toInstrumentedLatex(ast.right, rightPath);
      const op = wrapOperator(ast.op, path);

      const leftParen = this.shouldParen(ast.op, ast.left, false);
      const rightParen = this.shouldParen(ast.op, ast.right, true);

      const lStr = leftParen ? `(${left})` : left;
      const rStr = rightParen ? `(${right})` : right;

      return `${lStr} ${op} ${rStr}`;
    }

    if (ast.type === "variable") {
      return ast.name; // Variables not wrapped for now
    }

    return "";
  }

  /**
   * Augment AST with IDs for V5 Surface Map integration.
   * Assigns path-based IDs to each node in the AST.
   */
  augmentAstWithIds(root: any): any {
    if (!root) return root;

    const traverse = (node: any, path: string) => {
      if (!node || typeof node !== "object") return;

      // Assign ID to this node
      node.id = path;

      // Handle different node types
      switch (node.type) {
        case "binaryOp":
          // For binary operations, traverse left and right children
          if (node.left) {
            traverse(node.left, path === "root" ? "term[0]" : `${path}.term[0]`);
          }
          if (node.right) {
            traverse(node.right, path === "root" ? "term[1]" : `${path}.term[1]`);
          }
          break;

        case "unaryOp":
          if (node.argument) {
            traverse(node.argument, path === "root" ? "argument" : `${path}.argument`);
          }
          break;

        case "fraction":
          // Fractions have numerator/denominator as strings in current AST,
          // so no child traversal needed
          break;

        case "mixed":
          // Mixed numbers have whole, numerator, denominator as strings
          break;

        case "integer":
        case "variable":
          // Leaf nodes, no children to traverse
          break;

        default:
          // For any other node types, try to traverse common child properties
          if (node.left) traverse(node.left, `${path}.left`);
          if (node.right) traverse(node.right, `${path}.right`);
          if (node.children && Array.isArray(node.children)) {
            node.children.forEach((child: any, i: number) => {
              traverse(child, `${path}.child[${i}]`);
            });
          }
          break;
      }
    };

    traverse(root, "root");
    return root;
  }
}
