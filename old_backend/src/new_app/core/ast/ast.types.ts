/**
 * AST Types
 *
 * Type definitions for Abstract Syntax Tree nodes.
 */

export type AstNodeType =
  | "integer"
  | "fraction"
  | "mixed"
  | "variable"
  | "binaryOp"
  | "unaryOp"
  | "group";

export interface BaseAstNode {
  type: AstNodeType;
  id?: string;
}

export interface IntegerNode extends BaseAstNode {
  type: "integer";
  value: string;
}

export interface FractionNode extends BaseAstNode {
  type: "fraction";
  numerator: string;
  denominator: string;
}

export interface MixedNode extends BaseAstNode {
  type: "mixed";
  whole: string;
  numerator: string;
  denominator: string;
}

export interface VariableNode extends BaseAstNode {
  type: "variable";
  name: string;
}

export interface BinaryOpNode extends BaseAstNode {
  type: "binaryOp";
  op: "+" | "-" | "*" | "/";
  left: AstNode;
  right: AstNode;
}

export interface UnaryOpNode extends BaseAstNode {
  type: "unaryOp";
  op: "-" | "+";
  operand: AstNode;
}

export interface GroupNode extends BaseAstNode {
  type: "group";
  child: AstNode;
}

export type AstNode =
  | IntegerNode
  | FractionNode
  | MixedNode
  | VariableNode
  | BinaryOpNode
  | UnaryOpNode
  | GroupNode;
