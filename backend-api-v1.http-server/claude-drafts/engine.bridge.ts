/**
 * @module engine.bridge
 *
 * Pure translation layer that converts StepMaster decision results into
 * canonical engine execution requests. This bridge isolates the teaching
 * decision layer from the engine transport layer.
 *
 * The bridge performs a single responsibility: extract the chosen step's
 * engine request draft and wrap it with metadata for logging, correlation,
 * and analytics. No I/O, no side effects, pure data transformation.
 */

import type {
  InvariantSetId,
  EngineTargetId,
  EngineOperationId,
  EngineRequestDraft,
  MapMasterStepCandidate,
} from './mapmaster.core';

import type {
  StepMasterResult,
  StepMasterStatus,
  StepChoice,
  StepReasonCode,
} from './stepmaster.core';

/**
 * Additional, backend-facing metadata for a single engine execution.
 * This wraps metadata from the step decision so the engine layer
 * can log and correlate requests with teaching steps.
 */
export interface EngineExecutionMeta {
  /** ID of the underlying teaching/step request (from StepMasterResult.requestId). */
  requestId: string;

  /** Session ID from StepMasterResult.sessionId. */
  sessionId: string;

  /** Expression ID from StepMasterResult.expressionId. */
  expressionId: string;

  /** Engine target from StepMasterResult.engineTarget. */
  engineTarget: EngineTargetId;

  /** Optional invariant set and rule IDs for analytics/debugging. */
  invariantSetId?: InvariantSetId;

  /** Invariant rule ID from the engine request draft (if present). */
  invariantRuleId?: string;

  /** ID of the chosen step candidate (if any). */
  stepCandidateId?: string;

  /** Reason flags describing why this candidate was chosen (from StepChoice.flags). */
  stepReasonFlags?: StepReasonCode[];

  /** Final StepMaster decision status for this step. */
  stepStatus: StepMasterStatus;
}

/**
 * Canonical request object that the engine HTTP layer (or any other transport)
 * will send to the math engine.
 *
 * This is the final bridge output: a self-contained request with both
 * the low-level engine operation and high-level teaching metadata.
 */
export interface EngineExecutionRequest {
  /** Meta information used for logging, correlation and analytics. */
  meta: EngineExecutionMeta;

  /** The low-level draft describing the engine operation to perform. */
  draft: EngineRequestDraft;
}

/**
 * Input payload for building a single engine execution request.
 */
export interface BuildEngineExecutionRequestInput {
  /** Result of StepMaster decision. */
  stepResult: StepMasterResult;

  /**
   * Optional invariant set ID (usually comes from the expression context).
   * This is not present on StepMasterResult, so the caller may supply it here.
   */
  invariantSetId?: InvariantSetId;
}

/**
 * Build a canonical engine execution request from a StepMasterResult.
 *
 * This function is the core bridge between the teaching decision layer
 * (StepMaster) and the engine execution layer. It extracts the chosen
 * step's engine request draft and enriches it with metadata for tracking,
 * correlation, and analytics.
 *
 * The function is pure and deterministic:
 * - It does not mutate the input StepMasterResult.
 * - It does not perform any I/O or logging.
 * - For non-"ok" statuses or missing chosen candidate, it returns null.
 *
 * This design ensures that only valid, actionable steps are converted
 * into engine requests. Invalid or incomplete decisions are filtered out.
 *
 * @param input - The input payload with StepMasterResult and optional invariantSetId
 * @returns EngineExecutionRequest if a step was chosen, otherwise null
 *
 * @example
 * ```typescript
 * const engineRequest = buildEngineExecutionRequest({
 *   stepResult: stepMasterResult,
 *   invariantSetId: 'algebra-basic',
 * });
 *
 * if (engineRequest) {
 *   // Send to engine via HTTP, gRPC, etc.
 *   await engineClient.execute(engineRequest);
 * } else {
 *   // No step chosen, handle accordingly
 *   console.log('No step to execute');
 * }
 * ```
 */
export function buildEngineExecutionRequest(
  input: BuildEngineExecutionRequestInput,
): EngineExecutionRequest | null {
  const { stepResult, invariantSetId } = input;

  // Guard 1: Status must be 'ok'
  if (stepResult.status !== 'ok') {
    return null;
  }

  // Guard 2: Must have a chosen candidate
  if (!stepResult.chosenCandidate) {
    return null;
  }

  // Guard 3: Must have a choice object
  if (!stepResult.choice) {
    return null;
  }

  // Extract core values from stepResult
  const {
    expressionId,
    requestId,
    sessionId,
    engineTarget,
    status,
    chosenCandidate,
    choice,
  } = stepResult;

  // Extract values from choice
  const { candidateId, flags } = choice;

  // Extract values from chosenCandidate
  const { invariantId, engineRequest } = chosenCandidate;

  // Build metadata object
  const meta: EngineExecutionMeta = {
    requestId,
    sessionId,
    expressionId,
    engineTarget,
    stepStatus: status,
    stepCandidateId: candidateId,
    stepReasonFlags: flags ? [...flags] : [],
    invariantSetId,
    invariantRuleId: engineRequest.invariantRuleId,
  };

  // Create a shallow copy of the engine request draft to avoid mutation
  const draft: EngineRequestDraft = {
    ...engineRequest,
  };

  // If operands is an array, create a shallow copy to prevent aliasing
  if (Array.isArray(engineRequest.operands)) {
    draft.operands = [...engineRequest.operands];
  }

  // Return the assembled execution request
  return {
    meta,
    draft,
  };
}