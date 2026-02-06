/**
 * LatexInstrumenter.ts
 * Converts AST to instrumented LaTeX with data-ast-id wrappers.
 */

import { AstTraverser } from './ast-traverser';
import { Parser } from './parser';
import { AstNode, InstrumentationResult } from './types';

/**
 * LaTeX Instrumenter for converting AST to instrumented LaTeX.
 * Uses KaTeX's \htmlData command to embed AST node IDs into DOM.
 */

export class LatexInstrumenter {
  /**
   * @param ast - Augmented AST with node IDs
   */
  constructor(private readonly ast: AstNode | null) {}

  /**
   * Convert AST to instrumented LaTeX string.
   * @returns Instrumented LaTeX string
   */
  toInstrumentedLatex(): string {
    if (!this.ast) return '';
    return this._traverse(this.ast);
  }

  /**
   * Recursive traversal to generate instrumented LaTeX.
   * @param node - Current AST node
   * @returns LaTeX string for this node
   */
  private _traverse(node: AstNode | null | undefined): string {
    if (!node) return '';

    if (node.type === 'integer') {
      return this._wrapNumber(node.value, node.id);
    }

    if (node.type === 'binaryOp') {
      const left = this._traverse(node.left);
      const op = this._wrapOperator(node.op, node.id);
      const right = this._traverse(node.right);
      return `${left} ${op} ${right}`;
    }

    if (node.type === 'fraction') {
      const num = this._traverse(node.args[0]);
      const den = this._traverse(node.args[1]);
      const escaped = this._escapeNodeId(node.id);
      return `\\htmlData{ast-id=${escaped}, role=fraction}{\\frac{${num}}{${den}}}`;
    }

    if (node.type === 'unaryOp') {
      return `-${this._traverse(node.arg)}`;
    }

    if (node.type === 'mixed') {
      const escaped = this._escapeNodeId(node.id);
      return `\\htmlData{ast-id=${escaped}, role=mixed}{${node.whole}\\frac{${node.numerator}}{${node.denominator}}}`;
    }

    return '';
  }

  /**
   * Escape special characters for htmlData value.
   * @param id - Node ID
   * @returns Escaped ID
   */
  private _escapeNodeId(id: string | undefined): string {
    return (id || '').replace(/[{}\\]/g, '');
  }

  /**
   * Wrap a number value with htmlData.
   * @param value - Number value
   * @param nodeId - AST node ID
   * @returns Wrapped LaTeX
   */
  private _wrapNumber(value: string, nodeId: string | undefined): string {
    const escaped = this._escapeNodeId(nodeId);
    return `\\htmlData{ast-id=${escaped}, role=number}{${value}}`;
  }

  /**
   * Wrap an operator with htmlData.
   * @param op - Operator character
   * @param nodeId - AST node ID
   * @returns Wrapped LaTeX
   */
  private _wrapOperator(op: string, nodeId: string | undefined): string {
    const escaped = this._escapeNodeId(nodeId);
    // Map operators to LaTeX commands
    let latexOp = op;
    if (op === '*') latexOp = '\\cdot';
    if (op === '/') latexOp = '\\div';
    return `\\htmlData{ast-id=${escaped}, role=operator, operator=${op}}{${latexOp}}`;
  }

  /**
   * Convert LaTeX to instrumented LaTeX by parsing then re-serializing.
   * This is the main entry point for Stable-ID rendering.
   *
   * NO SILENT FALLBACK: Returns structured result with success/failure status.
   *
   * @param latex - Original LaTeX string
   * @returns Instrumentation result
   */
  static instrumentLatex(latex: string): InstrumentationResult {
    const ast = LatexInstrumenter.buildASTFromLatex(latex);

    if (!ast) {
      const reason = 'AST parser failed to parse expression';
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

    if (!instrumented || instrumented.trim() === '') {
      const reason = 'toInstrumentedLatex returned empty result';
      console.error(
        `[BUG] STABLE-ID instrumentation failed: ${reason}. LaTeX: "${latex}"`,
      );
      return {
        success: false,
        latex: latex,
        reason,
      };
    }

    console.log('[STABLE-ID] Instrumented LaTeX:', instrumented);
    return {
      success: true,
      latex: instrumented,
    };
  }

  /**
   * Integration point for future: Accept pre-built AST from backend.
   * This allows the backend to be the single source of truth for AST.
   *
   * @param ast - Pre-built AST with node IDs
   * @returns InstrumentationResult
   */
  static instrumentFromAST(ast: AstNode | null): InstrumentationResult {
    if (!ast) {
      return {
        success: false,
        latex: '',
        reason: 'No AST provided',
      };
    }

    const instrumenter = new LatexInstrumenter(ast);
    const instrumented = instrumenter.toInstrumentedLatex();

    if (!instrumented) {
      return {
        success: false,
        latex: '',
        reason: 'toInstrumentedLatex failed for provided AST',
      };
    }

    return {
      success: true,
      latex: instrumented,
    };
  }

  /**
   * Build an AST from LaTeX string and augment with IDs.
   * @param latex - LaTeX expression string
   * @returns Augmented AST or null
   */
  static buildASTFromLatex(latex: string): AstNode | null {
    const ast = Parser.parse(latex);
    if (!ast) return null;
    return AstTraverser.augmentWithIds(ast) as AstNode | null;
  }
}
