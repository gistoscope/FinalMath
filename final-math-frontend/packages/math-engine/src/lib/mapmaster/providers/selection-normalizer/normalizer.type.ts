import { MapMasterInput } from "../../mapmaster.types";
import { AstPath, ExpressionAstNode } from "../helpers/ast.helpers";
/**
 * Kind of the anchor that selection normalization produced.
 * - "Operator"  → anchor points to a binary operator node
 * - "Operand"   → anchor points to a value (fraction, integer, etc.)
 */
export type AnchorKind = "Operator" | "Operand";

/**
 * Normalized selection that MapMaster rule provider will use as an anchor.
 */
export interface NormalizedSelection {
  /** Path to the anchor node in the expression AST */
  anchorPath: AstPath;
  /** Whether the anchor is an operator or an operand */
  anchorKind: AnchorKind;
  /**
   * Human-readable trace of where the selection came from,
   * e.g. "clientEvent.astPath", "clientEvent.operatorIndex:0th operator",
   * "tsaSelection.astPath"
   */
  trace: string;
}

/**
 * Interface for selection normalizers.
 */
export interface SelectionNormalizer {
  normalizeSelection(input: MapMasterInput, rootAst: ExpressionAstNode): NormalizedSelection | null;
}
