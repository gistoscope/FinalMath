/**
 * ast-parser/index.ts
 * Main entry point for the AST parser module.
 */

import type {
  AugmentedAstNode,
  IntegerDescriptor,
  OperatorDescriptor,
} from "./AstTraverser";
import { AstTraverser } from "./AstTraverser";
import type { InstrumentationResult } from "./LatexInstrumenter";
import { LatexInstrumenter } from "./LatexInstrumenter";
import type { AstNode } from "./Parser";
import { Parser } from "./Parser";
import { Tokenizer, TokenType } from "./Tokenizer";

/**
 * Parse a LaTeX expression into an AST.
 * @param {string} latex - LaTeX expression
 * @returns {AstNode|null} AST root node or null
 */
export function parseExpression(latex: string): AstNode | null {
  return Parser.parse(latex);
}

/**
 * Augment AST with node IDs using the backend's convention.
 * @param {AstNode | null} root - AST root node
 * @returns {AugmentedAstNode|null} Augmented AST
 */
export function augmentAstWithIds(
  root: AstNode | null,
): AugmentedAstNode | null {
  return AstTraverser.augmentWithIds(root);
}

/**
 * Enumerate all operators in the AST in in-order traversal.
 * @param {AstNode | null} ast - Augmented AST
 * @returns {OperatorDescriptor[]} Array of operator descriptors
 */
export function enumerateOperators(ast: AstNode | null): OperatorDescriptor[] {
  return AstTraverser.enumerateOperators(ast);
}

/**
 * Enumerate all integers in the AST in in-order traversal.
 * @param {AstNode | null} ast - Augmented AST
 * @returns {IntegerDescriptor[]} Array of integer descriptors
 */
export function enumerateIntegers(ast: AstNode | null): IntegerDescriptor[] {
  return AstTraverser.enumerateIntegers(ast);
}

/**
 * Build an AST from LaTeX and augment with IDs.
 * @param {string} latex - LaTeX expression
 * @returns {AugmentedAstNode|null} Augmented AST or null
 */
export function buildASTFromLatex(latex: string): AugmentedAstNode | null {
  return LatexInstrumenter.buildASTFromLatex(latex);
}

/**
 * Convert AST to instrumented LaTeX.
 * @param {AugmentedAstNode | null} ast - Augmented AST
 * @returns {string} Instrumented LaTeX string
 */
export function toInstrumentedLatex(ast: AugmentedAstNode | null): string {
  const instrumenter = new LatexInstrumenter(ast);
  return instrumenter.toInstrumentedLatex();
}

/**
 * Convert LaTeX to instrumented LaTeX.
 * @param {string} latex - Original LaTeX string
 * @returns {InstrumentationResult}
 */
export function instrumentLatex(latex: string): InstrumentationResult {
  return LatexInstrumenter.instrumentLatex(latex);
}

/**
 * Create instrumented LaTeX from pre-built AST.
 * @param {AugmentedAstNode | null} ast - Pre-built AST with node IDs
 * @returns {InstrumentationResult}
 */
export function instrumentFromAST(
  ast: AugmentedAstNode | null,
): InstrumentationResult {
  return LatexInstrumenter.instrumentFromAST(ast);
}

// ============================================================================
// Class exports for direct usage
// ============================================================================

export { AstTraverser, LatexInstrumenter, Parser, Tokenizer, TokenType };
export type {
  AstNode,
  AugmentedAstNode,
  InstrumentationResult,
  IntegerDescriptor,
  OperatorDescriptor,
};
