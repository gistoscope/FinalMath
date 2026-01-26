/**
 * LatexInstrumenter.ts
 * Converts AST to instrumented LaTeX with data-ast-id wrappers.
 */

import { AstTraverser, AugmentedAstNode } from "./AstTraverser";
import { Parser } from "./Parser";

/**
 * Result of LaTeX instrumentation.
 */
export interface InstrumentationResult {
  success: boolean;
  latex: string;
  reason?: string;
}

/**
 * LaTeX Instrumenter for converting AST to instrumented LaTeX.
 * Uses KaTeX's \htmlData command to embed AST node IDs into DOM.
 */
export class LatexInstrumenter {
  private ast: AugmentedAstNode | null;

  /**
   * @param {AugmentedAstNode | null} ast - Augmented AST with node IDs
   */
  constructor(ast: AugmentedAstNode | null) {
    this.ast = ast;
  }

  /**
   * Convert AST to instrumented LaTeX string.
   * @returns {string} Instrumented LaTeX string
   */
  toInstrumentedLatex(): string {
    if (!this.ast) return "";
    return this._traverse(this.ast);
  }

  /**
   * Recursive traversal to generate instrumented LaTeX.
   * @param {AugmentedAstNode | null} node - Current AST node
   * @returns {string} LaTeX string for this node
   * @private
   */
  private _traverse(node: AugmentedAstNode | null): string {
    if (!node) return "";

    if (node.type === "integer") {
      return this._wrapNumber(node.value || "", node.id);
    }

    if (node.type === "binaryOp") {
      const left = this._traverse(node.left || null);
      const op = this._wrapOperator(node.op || "", node.id);
      const right = this._traverse(node.right || null);
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

  /**
   * Escape special characters for htmlData value.
   * @param {string} id - Node ID
   * @returns {string} Escaped ID
   * @private
   */
  private _escapeNodeId(id: string): string {
    return (id || "").replace(/[{}\\]/g, "");
  }

  /**
   * Wrap a number value with htmlData.
   * @param {string} value - Number value
   * @param {string} nodeId - AST node ID
   * @returns {string} Wrapped LaTeX
   * @private
   */
  private _wrapNumber(value: string, nodeId: string): string {
    const escaped = this._escapeNodeId(nodeId);
    return `\\htmlData{ast-id=${escaped}, role=number}{${value}}`;
  }

  /**
   * Wrap an operator with htmlData.
   * @param {string} op - Operator character
   * @param {string} nodeId - AST node ID
   * @returns {string} Wrapped LaTeX
   * @private
   */
  private _wrapOperator(op: string, nodeId: string): string {
    const escaped = this._escapeNodeId(nodeId);
    // Map operators to LaTeX commands
    let latexOp = op;
    if (op === "*") latexOp = "\\cdot";
    if (op === "/") latexOp = "\\div";
    return `\\htmlData{ast-id=${escaped}, role=operator, operator=${op}}{${latexOp}}`;
  }

  /**
   * Convert LaTeX to instrumented LaTeX by parsing then re-serializing.
   * This is the main entry point for Stable-ID rendering.
   *
   * @param {string} latex - Original LaTeX string
   * @returns {InstrumentationResult} Instrumentation result
   */
  static instrumentLatex(latex: string): InstrumentationResult {
    const ast = LatexInstrumenter.buildASTFromLatex(latex);

    if (!ast) {
      const reason = "AST parser failed to parse expression";
      console.error(
        `[BUG] STABLE-ID instrumentation failed: ${reason}. LaTeX: "${latex}"`,
      );
      return {
        success: false,
        latex: latex,
        reason,
      };
    }

    const instrumenter = new LatexInstrumenter(ast);
    const instrumented = instrumenter.toInstrumentedLatex();

    if (!instrumented || instrumented.trim() === "") {
      const reason = "toInstrumentedLatex returned empty result";
      console.error(
        `[BUG] STABLE-ID instrumentation failed: ${reason}. LaTeX: "${latex}"`,
      );
      return {
        success: false,
        latex: latex,
        reason,
      };
    }

    console.log("[STABLE-ID] Instrumented LaTeX:", instrumented);
    return {
      success: true,
      latex: instrumented,
    };
  }

  /**
   * Integration point for future: Accept pre-built AST from backend.
   *
   * @param {AugmentedAstNode | null} ast - Pre-built AST with node IDs
   * @returns {InstrumentationResult}
   */
  static instrumentFromAST(
    ast: AugmentedAstNode | null,
  ): InstrumentationResult {
    if (!ast) {
      return {
        success: false,
        latex: "",
        reason: "No AST provided",
      };
    }

    const instrumenter = new LatexInstrumenter(ast);
    const instrumented = instrumenter.toInstrumentedLatex();

    if (!instrumented) {
      return {
        success: false,
        latex: "",
        reason: "toInstrumentedLatex failed for provided AST",
      };
    }

    return {
      success: true,
      latex: instrumented,
    };
  }

  /**
   * Build an AST from LaTeX string and augment with IDs.
   * @param {string} latex - LaTeX expression string
   * @returns {AugmentedAstNode | null} Augmented AST or null
   */
  static buildASTFromLatex(latex: string): AugmentedAstNode | null {
    const ast = Parser.parse(latex);
    if (!ast) return null;
    return AstTraverser.augmentWithIds(ast);
  }
}
