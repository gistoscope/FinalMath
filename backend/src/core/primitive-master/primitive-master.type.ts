import { AstNode } from "../ast";

// --- Legacy Types Re-export (for compatibility) ---
export type PrimitiveMasterStatus = "match-found" | "no-match" | "error";

export interface PrimitiveMasterRequest {
  expressionLatex: string;
  selectionPath: string | null;
  operatorIndex?: number;
  invariantSetId?: string; // Ignored in V5
  expressionId?: string;
  context?: { userRole?: string };
}

export interface PrimitiveMasterWindow {
  centerPath: string;
  latexFragment: string;
  leftContextPaths?: string[];
  rightContextPaths?: string[];
}

export interface PrimitiveMasterDebugCandidate {
  primitiveId: PrimitiveId;
  verdict: "applicable" | "not-applicable";
  reason?: string;
}

export interface PrimitiveMasterDebug {
  candidates: PrimitiveMasterDebugCandidate[];
}

export interface PrimitiveMasterResultMatch {
  status: "match-found";
  primitiveId: PrimitiveId;
  window: PrimitiveMasterWindow;
  debug?: PrimitiveMasterDebug;
}

export interface PrimitiveMasterResultNoMatch {
  status: "no-match";
  reason: "selection-out-of-domain" | "no-primitive-for-selection";
  debug?: PrimitiveMasterDebug;
}

export interface PrimitiveMasterResultError {
  status: "error";
  errorCode: "parse-error" | "internal-error";
  message: string;
}

export type PrimitiveMasterResult =
  | PrimitiveMasterResultMatch
  | PrimitiveMasterResultNoMatch
  | PrimitiveMasterResultError;

export interface PrimitiveMasterDeps {
  parseLatexToAst: (latex: string, invariantSetId?: string) => Promise<AstNode | undefined>;
  // patternRegistry is no longer needed for V5 logic, but kept signature if needed
  log?: (message: string) => void;
}

export type Domain =
  | "integers"
  | "fractions"
  | "decimals"
  | "mixed"
  | "signs"
  | "brackets"
  | "algebra"
  | "trig";

export type OperandType =
  | "int"
  | "nonzero-int"
  | "fraction"
  | "nonzero-fraction"
  | "decimal"
  | "mixed-number"
  | "any";

export type PrimitiveColor = "green" | "yellow" | "red" | "blue";

export type UiMode = "auto-apply" | "requires-confirmation" | "context-menu" | "diagnostic-only";

export type ActionClass = "normal" | "diagnostic";

export type ClickTargetKind = "operator" | "number" | "fractionBar" | "bracket" | "other";

// --- 2. Guards & Scenarios (Spec Section 3) ---

export type GuardId =
  | "divisor-nonzero"
  | "result-is-integer"
  | "numerators-coprime"
  | "denominators-equal"
  | "denominators-different"
  | "operands-free"
  | "inside-brackets"
  | "left-negative"
  | "right-negative"
  | "divisor-zero"
  | "remainder-zero"
  | "remainder-nonzero"
  | "is-decimal"
  | "is-unary-negation";

export type ScenarioId =
  | "SC.FRACTIONS_COMMON_DEN"
  | "SC.DISTRIBUTIVE_EXPAND"
  | "SC.COLLECT_LIKE_TERMS"
  | "SC.NORMALIZE_MIXED";

export interface ScenarioMeta {
  scenarioId: ScenarioId;
  stepIndex: number;
  stepCount: number;
  isTerminalStep: boolean;
}

// --- 2.5 Node Context (Spec Section 5) ---
export type ExpressionId = string;
export type NodeId = string;

export interface ClickTarget {
  nodeId: NodeId;
  kind: ClickTargetKind;
  operatorIndex?: number;
}

export type ResolvePrimitiveParams = {
  expressionId: string;
  expressionLatex: string;
  click: {
    nodeId: string;
    kind: "operator" | "number" | "fractionBar" | "bracket" | "other";
    operatorIndex?: number;
  };
  ast?: AstNode; // Optional: Pass pre-parsed/mapped AST
  preferredPrimitiveId?: string; // Optional: force primitive (e.g. Hint Apply)
};

export type { NodeContext } from "./provider/context-builder";

export type PrimitiveId =
  | "P.INT_ADD"
  | "P.INT_SUB"
  | "P.INT_MUL"
  | "P.INT_DIV_EXACT"
  | "P.INT_DIV_TO_FRAC"
  | "P.FRAC_ADD_SAME_DEN"
  | "P.FRAC_SUB_SAME_DEN"
  | "P.FRAC_MUL"
  | "P.FRAC_DIV"
  | "P.INT_TO_FRAC"
  | "P.FRAC_TIMES_ONE"
  | "P.ONE_TO_UNIT_FRAC_2"
  | "P.ONE_TO_UNIT_FRAC_3"
  | "P.ONE_TO_UNIT_FRAC_5"
  | "P.ONE_TO_UNIT_FRAC_7"
  | "P.ONE_TO_UNIT_FRAC_K"
  | "P.MIXED_TO_SUM"
  | "P.FRAC_ADD_DIFF_PREP"
  | "P.FRAC_SUB_DIFF_PREP"
  | "P.FRAC_ADD_DIFF_DEN_MUL1"
  | "P.FRAC_SUB_DIFF_DEN_MUL1"
  | "P.FRAC_SUB_DIFF_DEN_MUL1"
  | "P.FRAC_ADD_DIFF"
  | "P.FRAC_SUB_DIFF"
  | "P.ONE_TO_TARGET_DENOM"
  | "P.DECIMAL_DIV"
  | "P.DECIMAL_TO_FRAC"
  | "P.BRACKETS_REMOVE"
  | "P.BRACKETS_CALC_INSIDE"
  | "P.DISTRIBUTE_MUL_ADD"
  | "P.DISTRIBUTE_MUL_SUB"
  | "P.FACTOR_ADD"
  | "P.FACTOR_SUB"
  | "P.ZERO_ADD_RIGHT"
  | "P.ZERO_ADD_LEFT"
  | "P.ZERO_SUB"
  | "P.ZERO_MUL_RIGHT"
  | "P.ZERO_MUL_LEFT"
  | "P.ONE_MUL_RIGHT"
  | "P.ONE_MUL_LEFT"
  | "P.ONE_DIV"
  | "P.SELF_DIV"
  | "P.DIV_BY_ZERO"
  | "P.ZERO_DIV_NONZERO"
  | "P.FRAC_SIMPLIFY_GCD"
  | "P.FRAC_ZERO_NUM"
  | "P.NEG_NEG"
  | "P.NEG_DISTRIBUTE_ADD"
  | "P.NEG_DISTRIBUTE_SUB"
  | "P.NEG_FRAC_NUM"
  | "P.NEG_FRAC_DEN"
  | "P.NEG_FRAC_BOTH"
  | "P.SUB_TO_ADD_NEG"
  | "P.ADD_NEG_TO_SUB"
  | "P.MUL_NEG_LEFT"
  | "P.MUL_NEG_RIGHT"
  | "P.MUL_NEG_BOTH"
  | "P.ADD_ASSOC_LEFT"
  | "P.ADD_ASSOC_RIGHT"
  | "P.MUL_ASSOC_LEFT"
  | "P.MUL_ASSOC_RIGHT"
  | "P.ADD_COMM"
  | "P.MUL_COMM"
  | "P.FRAC_IMPROPER_TO_MIXED"
  | "P.FRAC_MIXED_TO_IMPROPER"
  // Compatibility IDs (keep legacy IDs if needed by engine for now)
  | "P.FRAC_DIV_AS_MUL"
  | "P.FRAC_EQUIV"
  | "P.DEC_TO_FRAC"
  | "P.MIXED_TO_SUM"
  | "P.INT_TO_FRAC"
  | "P.FRAC_TO_INT"
  | "P.ONE_TO_UNIT_FRAC"
  | "P.INT_ADD"
  | "P.INT_SUB"
  | "P.INT_MUL"
  | "P.INT_DIV_EXACT"
  | "P.INT_DIV_TO_INT"
  | "P.INT_DIV_TO_FRAC"
  | "P.DECIMAL_DIV"
  | "P.FRAC_ADD_SAME_DEN"
  | "P.FRAC_SUB_SAME_DEN"
  | "P.FRAC_MUL"
  | "P.FRAC_DIV"
  | "P.FRAC_DIV_AS_MUL"
  | "P.FRAC_EQ_SCALE"
  | "P.FRAC_ADD_DIFF_DEN_MUL1"
  | "P.FRAC_SUB_DIFF_DEN_MUL1"
  | "P.ONE_TO_TARGET_DENOM"
  | "P.FRAC_MUL_BY_ONE"
  | "P.FRAC_LIFT_LEFT_BY_RIGHT_DEN"
  | "P.FRAC_LIFT_RIGHT_BY_LEFT_DEN"
  | "P.FRAC_MUL_UNIT"
  | "P.FRAC_EQUIV"
  | "P.DECIMAL_TO_FRAC"
  | "P.FRAC_ADD_AFTER_LIFT"
  | "P.NEG_BEFORE_NUMBER"
  | "P.NEG_NEG"
  | "P.NEG_DISTRIB_ADD"
  | "P.NEG_DISTRIB_SUB"
  | "P.PAREN_AROUND_ATOM_INT"
  | "P.PAREN_AROUND_ATOM_FRAC"
  | "P.PAREN_AROUND_EXPR_INT"
  | "P.PAREN_AROUND_EXPR_FRAC"
  | "P.NESTED_FRAC_DIV"
  | "P.INT_DIV_TO_INT"
  | "P.INT_DIV_TO_FRAC"
  | "P.INT_ADD"
  | "P.INT_SUB"
  | "P.INT_MUL"
  | "P.INT_DIV_EXACT"
  | "P.INT_DIV_TO_INT"
  | "P.INT_DIV_TO_FRAC"
  | "P.DECIMAL_DIV"
  | "P.FRAC_ADD_SAME_DEN"
  | "P.FRAC_SUB_SAME_DEN"
  | "P.FRAC_ADD_DIFF_DEN_MUL1"
  | "P.FRAC_SUB_DIFF_DEN_MUL1"
  | "P.FRAC_MUL"
  | "P.FRAC_DIV"
  | "P.FRAC_DIV_AS_MUL";
