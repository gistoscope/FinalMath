/**
 * constants.ts
 * Constants for surface map processing.
 */

export const OP_CHARS = "+-−*/:⋅·×÷";

export const STRUCTURAL_CLASSES = new Set([
  "vlist",
  "vlist-t",
  "vlist-r",
  "vbox",
  "pstrut",
  "sizing",
  "fontsize-ensurer",
  "mspace",
]);

export const ATOMIC_KINDS = new Set([
  "Num",
  "Var",
  "BinaryOp",
  "Relation",
  "ParenOpen",
  "ParenClose",
  "FracBar",
]);

export const OPERATOR_SLOT_KINDS = new Set([
  "BinaryOp",
  "MinusBinary",
  "Relation",
  "Fraction",
]);

export const INTERACTIVE_KINDS = new Set([
  "Num",
  "BinaryOp",
  "MinusBinary",
  "Relation",
]);
