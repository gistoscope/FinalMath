import { singleton } from "tsyringe";
import type { AugmentedAstNode } from "../models/AstNode";

export interface InstrumentationResult {
  success: boolean;
  latex: string;
  reason?: string;
}

/**
 * LaTeX Instrumenter for converting AST to instrumented LaTeX.
 * Uses KaTeX's \htmlData command to embed AST node IDs into DOM.
 */
@singleton()
export class LatexInstrumenter {
  /**
   * Convert AST to instrumented LaTeX string.
   */
  public toInstrumentedLatex(ast: AugmentedAstNode | null): string {
    if (!ast) return "";
    return this._traverse(ast);
  }

  private _traverse(node: AugmentedAstNode | null): string {
    if (!node) return "";

    if (node.type === "integer") {
      return this._wrapNumber(node.value || "", node.id);
    }

    if (node.type === "binaryOp") {
      const left = this._traverse((node.left as AugmentedAstNode) || null);
      const op = this._wrapOperator(node.op || "", node.id);
      const right = this._traverse((node.right as AugmentedAstNode) || null);
      return `${left} ${op} ${right}`;
    }

    if (node.type === "fraction") {
      const numNode = node.args ? (node.args[0] as AugmentedAstNode) : null;
      const denNode = node.args ? (node.args[1] as AugmentedAstNode) : null;
      const num = this._traverse(numNode);
      const den = this._traverse(denNode);
      const escaped = this._escapeNodeId(node.id);
      return `\\htmlData{ast-id=${escaped}, role=fraction}{\\frac{${num}}{${den}}}`;
    }

    if (node.type === "unaryOp") {
      const argNode = node.arg as AugmentedAstNode;
      return `-${this._traverse(argNode)}`;
    }

    return "";
  }

  private _escapeNodeId(id: string): string {
    return (id || "").replace(/[{}\\]/g, "");
  }

  private _wrapNumber(value: string, nodeId: string): string {
    const escaped = this._escapeNodeId(nodeId);
    return `\\htmlData{ast-id=${escaped}, role=number}{${value}}`;
  }

  private _wrapOperator(op: string, nodeId: string): string {
    const escaped = this._escapeNodeId(nodeId);
    let latexOp = op;
    if (op === "*") latexOp = "\\cdot";
    if (op === "/") latexOp = "\\div";
    return `\\htmlData{ast-id=${escaped}, role=operator, operator=${op}}{${latexOp}}`;
  }
}
