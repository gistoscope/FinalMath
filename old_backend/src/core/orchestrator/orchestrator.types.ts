/**
 * Orchestrator Types
 *
 * Type definitions for step orchestration.
 */

import type { PrimitiveDebugInfo, StepChoice, UserRole } from "../../types/backend-step.types.js";
import type { EngineStepExecutionResult } from "../engine/engine.types.js";
import type { InvariantRegistry } from "../invariants/InvariantRegistry.js";
import type { PrimitiveMaster } from "../primitive-master/PrimitiveMaster.js";
import type { StepHistory, StepPolicyConfig } from "../stepmaster/stepmaster.types.js";

export interface OrchestratorContext {
  invariantRegistry: InvariantRegistry;
  policy: StepPolicyConfig;
  primitiveMaster?: PrimitiveMaster;
}

export interface OrchestratorStepRequest {
  sessionId: string;
  courseId: string;
  expressionLatex: string;
  selectionPath: string | null;
  operatorIndex?: number;
  userRole: UserRole;
  userId?: string;
  preferredPrimitiveId?: string;
  surfaceNodeKind?: string;
  traceId?: string;
  clickTargetKind?: string;
  operator?: string;
  surfaceNodeId?: string;
}

export type OrchestratorStepStatus = "step-applied" | "no-candidates" | "engine-error" | "choice";

export interface OrchestratorStepResult {
  history: StepHistory;
  engineResult: EngineStepExecutionResult | null;
  status: OrchestratorStepStatus;
  debugInfo?: {
    allCandidates?: unknown[];
    [key: string]: unknown;
  } | null;
  primitiveDebug?: PrimitiveDebugInfo;
  choices?: StepChoice[];
  validationType?: "direct" | "requires-prep";
  validationDetail?: unknown;
}
