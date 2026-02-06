/**
 * AST Node Types
 */

export type NodeType =
  | 'integer'
  | 'binaryOp'
  | 'fraction'
  | 'unaryOp'
  | 'mixed';

export interface BaseNode {
  type: NodeType;
  id?: string;
}

export interface IntegerNode extends BaseNode {
  type: 'integer';
  value: string;
}

export interface BinaryOpNode extends BaseNode {
  type: 'binaryOp';
  op: string;
  left: AstNode;
  right: AstNode;
}

export interface FractionNode extends BaseNode {
  type: 'fraction';
  args: [AstNode, AstNode];
}

export interface UnaryOpNode extends BaseNode {
  type: 'unaryOp';
  op: string;
  arg: AstNode;
}

export interface MixedNode extends BaseNode {
  type: 'mixed';
  whole: string;
  numerator: string;
  denominator: string;
}

export type AstNode =
  | IntegerNode
  | BinaryOpNode
  | FractionNode
  | UnaryOpNode
  | MixedNode;

/**
 * Token Types
 */
export enum TokenType {
  NUMBER = 'NUMBER',
  OP = 'OP',
  FRAC = 'FRAC',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  SPACE = 'SPACE',
  MIXED = 'MIXED',
}

export interface Token {
  type: TokenType;
  value: string;
}

/**
 * Result of LaTeX instrumentation.
 */
export interface InstrumentationResult {
  success: boolean;
  latex: string;
  reason?: string;
}
