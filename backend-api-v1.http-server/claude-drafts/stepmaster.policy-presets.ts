/**
 * @module stepmaster.policy-presets
 *
 * Policy preset layer for StepMaster. Provides named presets for StepPolicyConfig
 * and helpers for creating and advancing StepPolicyContext in teaching sessions.
 *
 * This module is pure TypeScript with no I/O - all functions are deterministic
 * transformations on immutable data structures.
 */

import type {
  StepPolicyId,
  StepGranularity,
  StepPolicyConfig,
  StepPolicyContext,
  StepOutcomeStatus,
} from './stepmaster.core';

/**
 * Strongly-typed preset identifier.
 * Each preset represents a distinct teaching style and step granularity.
 */
export type StepPolicyPresetId =
  | 'student.micro'
  | 'student.normal'
  | 'student.macro'
  | 'teacher.normal';

/**
 * A named policy preset with human-readable metadata and configuration.
 * Presets provide a convenient way to configure StepMaster for different
 * teaching scenarios without manually specifying all policy fields.
 */
export interface StepPolicyPreset {
  /** Stable identifier of this preset (string union above). */
  id: StepPolicyPresetId;

  /** Short human-readable label, e.g. "Student / Micro". */
  label: string;

  /** One-sentence description for UI / teacher tools. */
  description: string;

  /** Concrete StepPolicyConfig used by StepMaster. */
  config: StepPolicyConfig;
}

/**
 * Immutable table of all available policy presets.
 * Each preset defines a complete StepPolicyConfig with specific
 * granularity, region preferences, and session limits.
 */
const STEP_POLICY_PRESETS: Record<StepPolicyPresetId, StepPolicyPreset> = {
  'student.micro': {
    id: 'student.micro',
    label: 'Student / Micro',
    description: 'Very small steps focused around the clicked region for careful learning.',
    config: {
      id: 'policy:student.micro',
      granularity: 'micro',
      preferClickedRegion: true,
      allowCrossRegionSteps: false,
      allowMultiPrimitiveSteps: false,
      maxStepsInSession: 80,
    },
  },

  'student.normal': {
    id: 'student.normal',
    label: 'Student / Normal',
    description: 'Default student mode with balanced step size and click focus.',
    config: {
      id: 'policy:student.normal',
      granularity: 'normal',
      preferClickedRegion: true,
      allowCrossRegionSteps: true,
      allowMultiPrimitiveSteps: false,
      maxStepsInSession: 120,
    },
  },

  'student.macro': {
    id: 'student.macro',
    label: 'Student / Macro',
    description: 'Bigger chunk steps for confident students who can handle larger transformations.',
    config: {
      id: 'policy:student.macro',
      granularity: 'macro',
      preferClickedRegion: false,
      allowCrossRegionSteps: true,
      allowMultiPrimitiveSteps: true,
      maxStepsInSession: 60,
    },
  },

  'teacher.normal': {
    id: 'teacher.normal',
    label: 'Teacher / Normal',
    description: 'Teacher-controlled flow with large steps and minimal click restrictions.',
    config: {
      id: 'policy:teacher.normal',
      granularity: 'macro',
      preferClickedRegion: false,
      allowCrossRegionSteps: true,
      allowMultiPrimitiveSteps: true,
      maxStepsInSession: 1000,
    },
  },
};

/**
 * Return a StepPolicyPreset by id.
 *
 * This function never throws. If the id is not recognized at runtime
 * (e.g., due to type casting or external data), it falls back to the
 * 'student.normal' preset.
 *
 * The returned preset should be treated as read-only by callers.
 *
 * @param presetId - The preset identifier to look up
 * @returns The corresponding preset, or 'student.normal' as fallback
 *
 * @example
 * ```typescript
 * const preset = getStepPolicyPreset('student.micro');
 * console.log(preset.label); // "Student / Micro"
 * ```
 */
export function getStepPolicyPreset(presetId: StepPolicyPresetId): StepPolicyPreset {
  return STEP_POLICY_PRESETS[presetId] ?? STEP_POLICY_PRESETS['student.normal'];
}

/**
 * Create a fresh StepPolicyContext from a preset id.
 *
 * This is the standard way to initialize a teaching session with a chosen
 * policy preset. The function creates a new context with:
 * - currentStepIndex = 0
 * - totalStepsDone = 0
 * - config is a shallow copy of the preset config (to avoid accidental
 *   mutation of the preset table)
 *
 * @param presetId - The preset identifier to use
 * @returns A new StepPolicyContext ready for a fresh session
 *
 * @example
 * ```typescript
 * const ctx = createInitialPolicyContext('student.normal');
 * // ctx.currentStepIndex === 0
 * // ctx.totalStepsDone === 0
 * // ctx.config matches the 'student.normal' preset
 * ```
 */
export function createInitialPolicyContext(presetId: StepPolicyPresetId): StepPolicyContext {
  const preset = getStepPolicyPreset(presetId);

  // Create a shallow copy of the config to prevent mutation of the preset table
  const config: StepPolicyConfig = {
    id: preset.config.id,
    granularity: preset.config.granularity,
    preferClickedRegion: preset.config.preferClickedRegion,
    allowCrossRegionSteps: preset.config.allowCrossRegionSteps,
    allowMultiPrimitiveSteps: preset.config.allowMultiPrimitiveSteps,
    maxStepsInSession: preset.config.maxStepsInSession,
  };

  return {
    config,
    currentStepIndex: 0,
    totalStepsDone: 0,
  };
}

/**
 * Check whether the policy context has reached its maxStepsInSession limit.
 *
 * This is useful for enforcing session boundaries and preventing
 * infinitely long problem-solving sessions.
 *
 * - If config.maxStepsInSession is undefined, always returns false
 *   (no limit enforced)
 * - Otherwise returns true when totalStepsDone >= maxStepsInSession
 *
 * @param ctx - The policy context to check
 * @returns true if the session limit has been reached
 *
 * @example
 * ```typescript
 * const ctx = createInitialPolicyContext('student.micro');
 * hasReachedMaxSteps(ctx); // false (totalStepsDone is 0)
 *
 * // After 80 steps...
 * if (hasReachedMaxSteps(ctx)) {
 *   console.log('Session limit reached!');
 * }
 * ```
 */
export function hasReachedMaxSteps(ctx: StepPolicyContext): boolean {
  if (ctx.config.maxStepsInSession === undefined) {
    return false;
  }

  return ctx.totalStepsDone >= ctx.config.maxStepsInSession;
}

/**
 * Return a new StepPolicyContext advanced according to the outcome of a step.
 *
 * This function implements the core counter advancement logic:
 * - Does not mutate the input ctx
 * - Increments counters based on outcome
 * - Respects config.maxStepsInSession: once the limit is reached,
 *   counters stop increasing
 *
 * Counter advancement rules:
 * - 'ok': Increment both totalStepsDone and currentStepIndex (successful step)
 * - 'error': Increment only totalStepsDone (attempted step but failed)
 * - 'noStep': No increments (no step was attempted)
 *
 * When maxStepsInSession limit is reached, all counters freeze.
 *
 * @param ctx - The current policy context
 * @param outcome - The outcome of the last step attempt
 * @returns A new StepPolicyContext with updated counters
 *
 * @example
 * ```typescript
 * let ctx = createInitialPolicyContext('student.normal');
 *
 * // After a successful step
 * ctx = advancePolicyContext(ctx, 'ok');
 * // ctx.totalStepsDone === 1, ctx.currentStepIndex === 1
 *
 * // After a failed step
 * ctx = advancePolicyContext(ctx, 'error');
 * // ctx.totalStepsDone === 2, ctx.currentStepIndex === 1 (unchanged)
 *
 * // No step chosen
 * ctx = advancePolicyContext(ctx, 'noStep');
 * // Counters remain unchanged
 * ```
 */
export function advancePolicyContext(
  ctx: StepPolicyContext,
  outcome: StepOutcomeStatus,
): StepPolicyContext {
  // Check if we've already reached the limit
  const limitReached = hasReachedMaxSteps(ctx);

  // If limit is reached, return a new context with unchanged counters
  if (limitReached) {
    return {
      config: ctx.config,
      currentStepIndex: ctx.currentStepIndex,
      totalStepsDone: ctx.totalStepsDone,
    };
  }

  // Determine counter increments based on outcome
  let newCurrentStepIndex = ctx.currentStepIndex;
  let newTotalStepsDone = ctx.totalStepsDone;

  switch (outcome) {
    case 'ok':
      // Successful step: increment both counters
      newCurrentStepIndex += 1;
      newTotalStepsDone += 1;
      break;

    case 'error':
      // Failed step attempt: increment only totalStepsDone
      newTotalStepsDone += 1;
      break;

    case 'noStep':
      // No step attempted: no increments
      break;
  }

  // Return new context with updated counters
  return {
    config: ctx.config,
    currentStepIndex: newCurrentStepIndex,
    totalStepsDone: newTotalStepsDone,
  };
}