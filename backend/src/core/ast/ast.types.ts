/**
 * MapMaster AST & Parser (TzV1.1)
 *
 * Provides a robust, recursive descent parser for mathematical expressions
 * supporting integers, fractions, mixed numbers, and binary operations.
 */

export type NodeType = "integer" | "fraction" | "mixed" | "binaryOp" | "variable" | "unaryOp";

export interface BaseNode {
  type: NodeType;
}

export interface IntegerNode extends BaseNode {
  type: "integer";
  value: string;
}

export interface FractionNode extends BaseNode {
  type: "fraction";
  numerator: string;
  denominator: string;
}

export interface MixedNumberNode extends BaseNode {
  type: "mixed";
  whole: string;
  numerator: string;
  denominator: string;
}

export interface BinaryOpNode extends BaseNode {
  type: "binaryOp";
  op: "+" | "-" | "*" | "/" | "\\div";
  left: AstNode;
  right: AstNode;
}

export interface VariableNode extends BaseNode {
  type: "variable";
  name: string;
}

export interface UnaryOpNode extends BaseNode {
  type: "unaryOp";
  op: "-" | "+";
  argument: AstNode;
}

export type AstNode =
  | IntegerNode
  | FractionNode
  | MixedNumberNode
  | BinaryOpNode
  | UnaryOpNode
  | VariableNode;

// --- Tokenizer ---

export type TokenType =
  | "NUMBER"
  | "OP"
  | "LPAREN"
  | "RPAREN"
  | "SLASH"
  | "SPACE"
  | "IDENTIFIER"
  | "LBRACE"
  | "RBRACE"
  | "COMMAND"
  | "COLON";

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}
