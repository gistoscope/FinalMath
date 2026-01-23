/**
 * ast-parser.js
 * Re-exports from the ast-parser module for backward compatibility.
 *
 * The implementation has been refactored into class-based modules:
 * - Tokenizer.js - Handles tokenization of LaTeX input
 * - Parser.js - Recursive descent parser for expressions
 * - AstTraverser.js - AST traversal and node operations
 * - LatexInstrumenter.js - LaTeX instrumentation with htmlData
 *
 * @see ./ast-parser/index.js
 */

export {
  AstTraverser,
  augmentAstWithIds,
  buildASTFromLatex,
  enumerateIntegers,
  enumerateOperators,
  instrumentFromAST,
  instrumentLatex,
  LatexInstrumenter,
  // Backward-compatible function exports
  parseExpression,
  Parser,
  toInstrumentedLatex,
  // Class exports
  Tokenizer,
  TokenType,
} from "./ast-parser/index.js";
