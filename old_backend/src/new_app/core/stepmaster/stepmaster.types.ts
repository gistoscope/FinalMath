/**
 * StepMaster Types
 *
 * Type definitions for step decision making.
 */

import type {
  MapMasterCandidate,
  MapMasterCandidateId,
} from "../mapmaster/mapmaster.types.js";

export type StepMasterDecisionStatus = "chosen" | "no-candidates";

export interface StepMasterInput {
  candidates: MapMasterCandidate[];
  history: StepHistorySnapshot;
  policy: StepPolicyConfig;
  actionTarget?: string | null;
}

export interface StepMasterDecision {
  status: StepMasterDecisionStatus;
  chosenCandidateId: MapMasterCandidateId | null;
}

export interface StepMasterResult {
  input: StepMasterInput;
  decision: StepMasterDecision;
  primitivesToApply: { id: string }[];
  id?: string;
}

export interface StepHistoryEntry {
  id: string;
  timestamp: number;
  expressionBefore: string;
  expressionAfter: string;
  invariantRuleId?: string;
  targetPath?: string;
  primitiveIds?: string[];
}

export interface StepHistory {
  entries: StepHistoryEntry[];
}

export interface StepHistorySnapshot {
  entryCount: number;
  lastStep?: {
    invariantRuleId?: string;
    targetPath?: string;
    primitiveIds?: string[];
    expressionBefore: string;
    expressionAfter: string;
  };
}

export interface StepPolicyConfig {
  name: string;
  allowRepetition: boolean;
  maxHistoryDepth: number;
  localityEnforcement: boolean;
}
