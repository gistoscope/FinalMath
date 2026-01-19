/**
 * PrimitiveMaster Types
 *
 * Type definitions for primitive matching and selection.
 */

import type { PrimitiveId } from "../invariants/invariant.types.js";

export type PrimitiveMasterStatus = "match-found" | "no-match" | "error";

export interface PrimitiveMasterRequest {
  expressionLatex: string;
  selectionPath: string | null;
  operatorIndex?: number;
  invariantSetId?: string;
  expressionId?: string;
  context?: { userRole?: string };
  userRole?: string;
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

export interface ClickTarget {
  nodeId: string;
  kind: string;
  operatorIndex?: number;
}

export type SelectedOutcomeKind =
  | "green-primitive"
  | "yellow-scenario"
  | "blue-choice"
  | "red-diagnostic";

export interface SelectedOutcome {
  kind: SelectedOutcomeKind;
  primitive?: {
    id: string;
    label: string;
    enginePrimitiveId: string;
  };
  matches?: {
    row: {
      id: string;
      label?: string;
      enginePrimitiveId?: string;
    };
    ctx?: {
      actionNodeId?: string;
      clickTarget?: ClickTarget;
    };
  }[];
}
