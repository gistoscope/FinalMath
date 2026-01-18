/**
 * LatexInstrumenter.js
 * Converts AST to instrumented LaTeX with data-ast-id wrappers.
 */

import { AstTraverser } from "./AstTraverser.js";
import { Parser } from "./Parser.js";

/**
 * Result of LaTeX instrumentation.
 * @typedef {Object} InstrumentationResult
 * @property {boolean} success - Whether instrumentation succeeded
 * @property {string} latex - Instrumented or original LaTeX string
 * @property {string} [reason] - Reason for failure (if any)
 */

/**
 * LaTeX Instrumenter for converting AST to instrumented LaTeX.
 * Uses KaTeX's \htmlData command to embed AST node IDs into DOM.
 */
export class LatexInstrumenter {
  /**
   * @param {Object} ast - Augmented AST with node IDs
   */
  constructor(ast) {
    this.ast = ast;
  }

  /**
   * Convert AST to instrumented LaTeX string.
   * @returns {string} Instrumented LaTeX string
   */
  toInstrumentedLatex() {
    if (!this.ast) return "";
    return this._traverse(this.ast);
  }

  /**
   * Recursive traversal to generate instrumented LaTeX.
   * @param {Object} node - Current AST node
   * @returns {string} LaTeX string for this node
   * @private
   */
  _traverse(node) {
    if (!node) return "";

    if (node.type === "integer") {
      return this._wrapNumber(node.value, node.id);
    }

    if (node.type === "binaryOp") {
      const left = this._traverse(node.left);
      const op = this._wrapOperator(node.op, node.id);
      const right = this._traverse(node.right);
      return `${left} ${op} ${right}`;
    }

    if (node.type === "fraction") {
      const num = this._traverse(node.args[0]);
      const den = this._traverse(node.args[1]);
      const escaped = this._escapeNodeId(node.id);
      return `\\htmlData{ast-id=${escaped}, role=fraction}{\\frac{${num}}{${den}}}`;
    }

    if (node.type === "unaryOp") {
      return `-${this._traverse(node.arg)}`;
    }

    return "";
  }

  /**
   * Escape special characters for htmlData value.
   * @param {string} id - Node ID
   * @returns {string} Escaped ID
   * @private
   */
  _escapeNodeId(id) {
    return (id || "").replace(/[{}\\]/g, "");
  }

  /**
   * Wrap a number value with htmlData.
   * @param {string} value - Number value
   * @param {string} nodeId - AST node ID
   * @returns {string} Wrapped LaTeX
   * @private
   */
  _wrapNumber(value, nodeId) {
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
  _wrapOperator(op, nodeId) {
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
   * NO SILENT FALLBACK: Returns structured result with success/failure status.
   *
   * @param {string} latex - Original LaTeX string
   * @returns {InstrumentationResult} Instrumentation result
   */
  static instrumentLatex(latex) {
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
   * This allows the backend to be the single source of truth for AST.
   *
   * @param {Object} ast - Pre-built AST with node IDs
   * @returns {InstrumentationResult}
   */
  static instrumentFromAST(ast) {
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
   * @returns {Object|null} Augmented AST or null
   */
  static buildASTFromLatex(latex) {
    const ast = Parser.parse(latex);
    if (!ast) return null;
    return AstTraverser.augmentWithIds(ast);
  }
}
