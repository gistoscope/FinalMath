/**
 * ast-parser/index.js
 * Main entry point for the AST parser module.
 * Exports the public API maintaining backward compatibility with the original ast-parser.js
 */

import { AstTraverser } from "./AstTraverser.js";
import { LatexInstrumenter } from "./LatexInstrumenter.js";
import { Parser } from "./Parser.js";
import { Tokenizer, TokenType } from "./Tokenizer.js";

// ============================================================================
// Backward-compatible function exports
// ============================================================================

/**
 * Parse a LaTeX expression into an AST.
 * @param {string} latex - LaTeX expression
 * @returns {Object|null} AST root node or null
 */
export function parseExpression(latex) {
  return Parser.parse(latex);
}

/**
 * Augment AST with node IDs using the backend's convention.
 * @param {Object} root - AST root node
 * @returns {Object} Augmented AST
 */
export function augmentAstWithIds(root) {
  return AstTraverser.augmentWithIds(root);
}

/**
 * Enumerate all operators in the AST in in-order traversal.
 * @param {Object} ast - Augmented AST
 * @returns {Array} Array of operator descriptors
 */
export function enumerateOperators(ast) {
  return AstTraverser.enumerateOperators(ast);
}

/**
 * Enumerate all integers in the AST in in-order traversal.
 * @param {Object} ast - Augmented AST
 * @returns {Array} Array of integer descriptors
 */
export function enumerateIntegers(ast) {
  return AstTraverser.enumerateIntegers(ast);
}

/**
 * Build an AST from LaTeX and augment with IDs.
 * @param {string} latex - LaTeX expression
 * @returns {Object|null} Augmented AST or null
 */
export function buildASTFromLatex(latex) {
  return LatexInstrumenter.buildASTFromLatex(latex);
}

/**
 * Convert AST to instrumented LaTeX.
 * @param {Object} ast - Augmented AST
 * @returns {string} Instrumented LaTeX string
 */
export function toInstrumentedLatex(ast) {
  const instrumenter = new LatexInstrumenter(ast);
  return instrumenter.toInstrumentedLatex();
}

/**
 * Convert LaTeX to instrumented LaTeX.
 * @param {string} latex - Original LaTeX string
 * @returns {{ success: boolean, latex: string, reason?: string }}
 */
export function instrumentLatex(latex) {
  return LatexInstrumenter.instrumentLatex(latex);
}

/**
 * Create instrumented LaTeX from pre-built AST.
 * @param {Object} ast - Pre-built AST with node IDs
 * @returns {{ success: boolean, latex: string, reason?: string }}
 */
export function instrumentFromAST(ast) {
  return LatexInstrumenter.instrumentFromAST(ast);
}

// ============================================================================
// Class exports for direct usage
// ============================================================================

export { AstTraverser, LatexInstrumenter, Parser, Tokenizer, TokenType };
