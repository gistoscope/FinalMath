/**
 * @fileoverview Constants for surface map processing
 * Contains operator characters, structural classes, and other shared constants.
 */

/**
 * Characters that represent operators in expressions.
 * Includes ASCII and Unicode variants.
 */
export const OP_CHARS = "+-−*/:⋅·×÷";

/**
 * KaTeX classes that are used only for layout,
 * but do not carry mathematical meaning.
 */
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

/**
 * Atomic node kinds that are considered interactive.
 */
export const ATOMIC_KINDS = new Set([
  "Num",
  "Var",
  "BinaryOp",
  "Relation",
  "ParenOpen",
  "ParenClose",
  "FracBar",
]);

/**
 * Operator kinds that are considered operator slots for TSA.
 */
export const OPERATOR_SLOT_KINDS = new Set([
  "BinaryOp",
  "MinusBinary",
  "Relation",
  "Fraction",
]);

/**
 * Interactive element kinds that should have data-ast-id.
 */
export const INTERACTIVE_KINDS = new Set([
  "Num",
  "BinaryOp",
  "MinusBinary",
  "Relation",
]);
