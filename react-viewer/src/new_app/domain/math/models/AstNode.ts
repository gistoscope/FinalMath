/**
 * AstNode.ts
 * Core types for the mathematical Abstract Syntax Tree.
 */

export const AstNodeType = {
  BINARY_OP: "binaryOp",
  UNARY_OP: "unaryOp",
  INTEGER: "integer",
  FRACTION: "fraction",
  MIXED: "mixed",
  NUMERATOR: "numerator",
  DENOMINATOR: "denominator",
  WHOLE: "whole",
  VAL: "val",
} as const;

export type AstNodeType = (typeof AstNodeType)[keyof typeof AstNodeType];

export interface AstNode {
  type: AstNodeType;
  value?: string;
  op?: string;
  left?: AstNode;
  right?: AstNode;
  arg?: AstNode;
  args?: AstNode[];
  numerator?: AstNode | string;
  denominator?: AstNode | string;
  whole?: AstNode | string;
  id?: string; // Optional ID for augmented ASTs
}

export interface AugmentedAstNode extends AstNode {
  id: string;
}
