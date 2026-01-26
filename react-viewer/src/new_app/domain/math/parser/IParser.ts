/**
 * IParser.ts
 * Interface for parsing math expressions into AST.
 */

import type { AstNode } from "../models/AstNode";

export interface IParser {
  parse(latex: string): AstNode | null;
}
