/**
 * MapMaster Types
 *
 * Type definitions for candidate generation.
 */

import type {
  InvariantRuleId,
  InvariantSetId,
  PrimitiveId,
} from "../invariants/invariant.types.js";
import type { InvariantRegistry } from "../invariants/InvariantRegistry.js";

export type MapMasterCandidateId = string & { __brand: "MapMasterCandidateId" };

export interface MapMasterInput {
  expressionLatex: string;
  selectionPath: string | null;
  operatorIndex?: number;
  invariantSetIds: InvariantSetId[];
  registry: InvariantRegistry;
}

export interface MapMasterCandidate {
  id: MapMasterCandidateId;
  invariantRuleId: InvariantRuleId;
  primitiveIds: PrimitiveId[];
  targetPath: string;
  description: string;
  bindings?: Record<string, unknown>;
  resultPattern?: string;
  category?: "direct" | "support";
}

export interface MapMasterResult {
  candidates: MapMasterCandidate[];
  resolvedSelectionPath?: string;
}
