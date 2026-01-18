/**
 * @module stepmaster.history-service
 *
 * Centralized helpers for managing StepHistory and converting StepMasterResult
 * into StepHistoryEntry records. This module provides pure, deterministic functions
 * for status mapping, step ID generation, and history accumulation.
 *
 * All functions are side-effect free and work with immutable data structures.
 */

import type {
  StepHistory,
  StepHistoryEntry,
  StepOutcomeStatus,
  StepMasterResult,
  StepMasterStatus,
} from './stepmaster.core';

/**
 * Input for appending a step to history based on a StepMasterResult.
 */
export interface AppendStepFromResultInput {
  /** Current step history. */
  history: StepHistory;

  /** Result from StepMaster that describes the step outcome. */
  result: StepMasterResult;

  /**
   * Logical timestamp for this step.
   * The caller decides what this means (e.g. Date.now, client event timestamp, etc.).
   */
  timestamp: number;
}

/**
 * Map a StepMasterStatus to a StepOutcomeStatus for history recording.
 *
 * This conversion allows the history layer to use a simpler status model
 * that focuses on outcome rather than the detailed decision status.
 *
 * Mapping rules:
 * - 'ok' → 'ok' (step was successfully chosen and applied)
 * - 'noCandidates' → 'noStep' (no step was available to choose)
 * - 'scoringFailed' → 'error' (something went wrong during scoring)
 *
 * @param status - The StepMaster decision status
 * @returns The corresponding outcome status for history
 *
 * @example
 * ```typescript
 * const outcome = mapStepMasterStatusToOutcome('ok');
 * // outcome === 'ok'
 * ```
 */
export function mapStepMasterStatusToOutcome(status: StepMasterStatus): StepOutcomeStatus {
  switch (status) {
    case 'ok':
      return 'ok';
    case 'noCandidates':
      return 'noStep';
    case 'scoringFailed':
      return 'error';
  }
}

/**
 * Build a deterministic step ID from expression ID, step index, and timestamp.
 *
 * The format is: `step:{expressionId}:{stepIndex}:{timestamp}`
 *
 * Normalization rules:
 * - If expressionId is empty, use 'unknown' instead
 * - If stepIndex is negative, normalize to 0
 *
 * This format allows step IDs to be:
 * - Sortable by timestamp
 * - Traceable to specific expressions
 * - Unique within a session
 *
 * @param expressionId - The expression this step belongs to
 * @param stepIndex - Zero-based index of this step in the history
 * @param timestamp - Timestamp when this step occurred
 * @returns A formatted step ID string
 *
 * @example
 * ```typescript
 * const id = buildStepId('expr-123', 0, 1700000000000);
 * // id === 'step:expr-123:0:1700000000000'
 *
 * const id2 = buildStepId('', 0, 1700000000000);
 * // id2 === 'step:unknown:0:1700000000000'
 * ```
 */
export function buildStepId(
  expressionId: string,
  stepIndex: number,
  timestamp: number,
): string {
  // Normalize expressionId: empty string becomes 'unknown'
  const normalizedExpressionId = expressionId === '' ? 'unknown' : expressionId;

  // Normalize stepIndex: negative becomes 0
  const normalizedStepIndex = stepIndex < 0 ? 0 : stepIndex;

  return `step:${normalizedExpressionId}:${normalizedStepIndex}:${timestamp}`;
}

/**
 * Build a StepHistoryEntry from a StepMasterResult.
 *
 * This function extracts the relevant fields from the result and constructs
 * a history entry suitable for persistence and analytics.
 *
 * Field extraction rules:
 * - expressionId: always copied from result
 * - candidateId: extracted from result.choice if present
 * - invariantId: extracted from result.chosenCandidate if present
 * - status and timestamp: passed as arguments
 * - stepId: passed as argument (generated elsewhere)
 *
 * @param result - The StepMaster decision result
 * @param outcome - The outcome status for this entry
 * @param stepId - The unique identifier for this step
 * @param timestamp - The timestamp for this step
 * @returns A complete history entry
 *
 * @example
 * ```typescript
 * const entry = buildEntryFromResult(
 *   stepResult,
 *   'ok',
 *   'step:expr-123:0:1700000000000',
 *   1700000000000
 * );
 * ```
 */
export function buildEntryFromResult(
  result: StepMasterResult,
  outcome: StepOutcomeStatus,
  stepId: string,
  timestamp: number,
): StepHistoryEntry {
  return {
    stepId,
    expressionId: result.expressionId,
    candidateId: result.choice?.candidateId,
    invariantId: result.chosenCandidate?.invariantId,
    timestamp,
    status: outcome,
  };
}

/**
 * Append a new step entry to history based on a StepMasterResult.
 *
 * This is the main entry point for updating step history after each
 * StepMaster decision. It orchestrates the entire process:
 * 1. Map the result status to an outcome
 * 2. Calculate the step index from current history length
 * 3. Generate a unique step ID
 * 4. Build the history entry
 * 5. Return a new history with the entry appended
 *
 * The function is completely immutable - it never modifies the input
 * history and always returns a new StepHistory object.
 *
 * @param input - Contains history, result, and timestamp
 * @returns A new StepHistory with the step appended
 *
 * @example
 * ```typescript
 * let history = { entries: [] };
 *
 * // After first step
 * history = appendStepFromResult({
 *   history,
 *   result: stepResult1,
 *   timestamp: 1700000000000,
 * });
 * // history.entries.length === 1
 *
 * // After second step
 * history = appendStepFromResult({
 *   history,
 *   result: stepResult2,
 *   timestamp: 1700000001000,
 * });
 * // history.entries.length === 2
 * ```
 */
export function appendStepFromResult(
  input: AppendStepFromResultInput,
): StepHistory {
  const { history, result, timestamp } = input;

  // Step 1: Map status to outcome
  const outcome = mapStepMasterStatusToOutcome(result.status);

  // Step 2: Calculate step index (position in history)
  const stepIndex = history.entries.length;

  // Step 3: Generate step ID
  const stepId = buildStepId(result.expressionId, stepIndex, timestamp);

  // Step 4: Build the history entry
  const newEntry = buildEntryFromResult(result, outcome, stepId, timestamp);

  // Step 5: Return new history with entry appended
  return {
    entries: [...history.entries, newEntry],
  };
}