/**
 * ITokenizer.ts
 * Interface for LaTeX arithmetic tokenization.
 */

export const TokenType = {
  NUMBER: "NUMBER",
  OP: "OP",
  FRAC: "FRAC",
  LPAREN: "LPAREN",
  RPAREN: "RPAREN",
  LBRACE: "LBRACE",
  RBRACE: "RBRACE",
} as const;

export type TokenType = (typeof TokenType)[keyof typeof TokenType];

export interface Token {
  type: TokenType;
  value: string;
}

export interface ITokenizer {
  tokenize(input: string): Token[];
}
