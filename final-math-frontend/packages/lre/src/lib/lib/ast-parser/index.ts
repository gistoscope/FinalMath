/**
 * ast-parser/index.js
 * Main entry point for the AST parser module.
 * Exports the public API maintaining backward compatibility with the original ast-parser.js
 */

import { AstTraverser } from './ast-traverser';
import { LatexInstrumenter } from './latex-instrumenter';
import { Parser } from './parser';
import { Tokenizer } from './tokenizer';
import { AstNode } from './types';
export * from './types';

export const buildASTFromLatex = (latex: string) => {
  const ast = Parser.parse(latex);
  if (!ast) return null;
  return AstTraverser.augmentWithIds(ast) as AstNode;
};

export const enumerateIntegers = (ast: AstNode) => {
  return AstTraverser.enumerateIntegers(ast);
};

export const enumerateOperators = (ast: AstNode) => {
  return AstTraverser.enumerateOperators(ast);
};

// export { buildASTFromLatex,
//   enumerateIntegers,
//   enumerateOperators,} from './ast-parser';

export { LatexInstrumenter, Parser, Tokenizer };
