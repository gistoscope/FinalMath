import { describe, it, expect } from 'vitest';

import {
  getStepPolicyPreset,
  createInitialPolicyContext,
  hasReachedMaxSteps,
  advancePolicyContext,
  type StepPolicyPreset,
  type StepPolicyPresetId,
} from '../src/stepmaster.policy-presets';

import type {
  StepPolicyContext,
  StepPolicyConfig,
  StepOutcomeStatus,
} from '../src/stepmaster.core';

describe('stepmaster.policy-presets', () => {
  describe('getStepPolicyPreset', () => {
    describe('student.micro preset', () => {
      it('should return preset with correct id and metadata', () => {
        const preset = getStepPolicyPreset('student.micro');

        expect(preset.id).toBe('student.micro');
        expect(preset.label).toBeTruthy();
        expect(preset.label.length).toBeGreaterThan(0);
        expect(preset.description).toBeTruthy();
        expect(preset.description.length).toBeGreaterThan(0);
      });

      it('should have correct config values', () => {
        const preset = getStepPolicyPreset('student.micro');

        expect(preset.config.id).toBe('policy:student.micro');
        expect(preset.config.granularity).toBe('micro');
        expect(preset.config.preferClickedRegion).toBe(true);
        expect(preset.config.allowCrossRegionSteps).toBe(false);
        expect(preset.config.allowMultiPrimitiveSteps).toBe(false);
        expect(preset.config.maxStepsInSession).toBe(80);
      });
    });

    describe('student.normal preset', () => {
      it('should return preset with correct id and metadata', () => {
        const preset = getStepPolicyPreset('student.normal');

        expect(preset.id).toBe('student.normal');
        expect(preset.label).toBeTruthy();
        expect(preset.label.length).toBeGreaterThan(0);
        expect(preset.description).toBeTruthy();
        expect(preset.description.length).toBeGreaterThan(0);
      });

      it('should have correct config values', () => {
        const preset = getStepPolicyPreset('student.normal');

        expect(preset.config.id).toBe('policy:student.normal');
        expect(preset.config.granularity).toBe('normal');
        expect(preset.config.preferClickedRegion).toBe(true);
        expect(preset.config.allowCrossRegionSteps).toBe(true);
        expect(preset.config.allowMultiPrimitiveSteps).toBe(false);
        expect(preset.config.maxStepsInSession).toBe(120);
      });
    });

    describe('student.macro preset', () => {
      it('should return preset with correct id and metadata', () => {
        const preset = getStepPolicyPreset('student.macro');

        expect(preset.id).toBe('student.macro');
        expect(preset.label).toBeTruthy();
        expect(preset.label.length).toBeGreaterThan(0);
        expect(preset.description).toBeTruthy();
        expect(preset.description.length).toBeGreaterThan(0);
      });

      it('should have correct config values', () => {
        const preset = getStepPolicyPreset('student.macro');

        expect(preset.config.id).toBe('policy:student.macro');
        expect(preset.config.granularity).toBe('macro');
        expect(preset.config.preferClickedRegion).toBe(false);
        expect(preset.config.allowCrossRegionSteps).toBe(true);
        expect(preset.config.allowMultiPrimitiveSteps).toBe(true);
        expect(preset.config.maxStepsInSession).toBe(60);
      });
    });

    describe('teacher.normal preset', () => {
      it('should return preset with correct id and metadata', () => {
        const preset = getStepPolicyPreset('teacher.normal');

        expect(preset.id).toBe('teacher.normal');
        expect(preset.label).toBeTruthy();
        expect(preset.label.length).toBeGreaterThan(0);
        expect(preset.description).toBeTruthy();
        expect(preset.description.length).toBeGreaterThan(0);
      });

      it('should have correct config values', () => {
        const preset = getStepPolicyPreset('teacher.normal');

        expect(preset.config.id).toBe('policy:teacher.normal');
        expect(preset.config.granularity).toBe('macro');
        expect(preset.config.preferClickedRegion).toBe(false);
        expect(preset.config.allowCrossRegionSteps).toBe(true);
        expect(preset.config.allowMultiPrimitiveSteps).toBe(true);
        expect(preset.config.maxStepsInSession).toBe(1000);
      });
    });

    describe('unknown preset id', () => {
      it('should fall back to student.normal preset', () => {
        // Cast to simulate runtime unknown value
        const unknownId = 'unknown.preset' as StepPolicyPresetId;
        const preset = getStepPolicyPreset(unknownId);

        expect(preset.id).toBe('student.normal');
        expect(preset.config.id).toBe('policy:student.normal');
      });
    });
  });

  describe('createInitialPolicyContext', () => {
    it('should create context with zero counters for student.micro', () => {
      const ctx = createInitialPolicyContext('student.micro');

      expect(ctx.currentStepIndex).toBe(0);
      expect(ctx.totalStepsDone).toBe(0);
    });

    it('should copy config values from preset for student.micro', () => {
      const preset = getStepPolicyPreset('student.micro');
      const ctx = createInitialPolicyContext('student.micro');

      expect(ctx.config.id).toBe(preset.config.id);
      expect(ctx.config.granularity).toBe(preset.config.granularity);
      expect(ctx.config.preferClickedRegion).toBe(preset.config.preferClickedRegion);
      expect(ctx.config.allowCrossRegionSteps).toBe(preset.config.allowCrossRegionSteps);
      expect(ctx.config.allowMultiPrimitiveSteps).toBe(preset.config.allowMultiPrimitiveSteps);
      expect(ctx.config.maxStepsInSession).toBe(preset.config.maxStepsInSession);
    });

    it('should not mutate the preset when context config is modified', () => {
      // Get original preset
      const presetBefore = getStepPolicyPreset('student.micro');
      const originalMaxSteps = presetBefore.config.maxStepsInSession;
      const originalId = presetBefore.config.id;

      // Create context and mutate it
      const ctx = createInitialPolicyContext('student.micro');
      ctx.config.maxStepsInSession = 999;
      ctx.config.id = 'mutated-id';

      // Get preset again and verify it's unchanged
      const presetAfter = getStepPolicyPreset('student.micro');
      expect(presetAfter.config.maxStepsInSession).toBe(originalMaxSteps);
      expect(presetAfter.config.id).toBe(originalId);
      expect(presetAfter.config.maxStepsInSession).toBe(80);
      expect(presetAfter.config.id).toBe('policy:student.micro');
    });

    it('should create independent contexts for multiple presets', () => {
      const ctx1 = createInitialPolicyContext('student.micro');
      const ctx2 = createInitialPolicyContext('teacher.normal');

      expect(ctx1.config.granularity).toBe('micro');
      expect(ctx2.config.granularity).toBe('macro');
      expect(ctx1.config.maxStepsInSession).toBe(80);
      expect(ctx2.config.maxStepsInSession).toBe(1000);
    });
  });

  describe('hasReachedMaxSteps', () => {
    describe('when maxStepsInSession is undefined', () => {
      it('should always return false', () => {
        // Create a context and remove maxStepsInSession
        const ctx = createInitialPolicyContext('student.normal');
        const modifiedCtx: StepPolicyContext = {
          ...ctx,
          config: {
            ...ctx.config,
            maxStepsInSession: undefined,
          },
          totalStepsDone: 999999,
        };

        expect(hasReachedMaxSteps(modifiedCtx)).toBe(false);
      });
    });

    describe('when maxStepsInSession is set', () => {
      it('should return false when below limit', () => {
        const ctx = createInitialPolicyContext('student.micro');
        const modifiedCtx: StepPolicyContext = {
          ...ctx,
          totalStepsDone: 50, // Below 80
        };

        expect(hasReachedMaxSteps(modifiedCtx)).toBe(false);
      });

      it('should return true when at limit', () => {
        const ctx = createInitialPolicyContext('student.micro');
        const modifiedCtx: StepPolicyContext = {
          ...ctx,
          totalStepsDone: 80, // Exactly at 80
        };

        expect(hasReachedMaxSteps(modifiedCtx)).toBe(true);
      });

      it('should return true when above limit', () => {
        const ctx = createInitialPolicyContext('student.micro');
        const modifiedCtx: StepPolicyContext = {
          ...ctx,
          totalStepsDone: 100, // Above 80
        };

        expect(hasReachedMaxSteps(modifiedCtx)).toBe(true);
      });

      it('should return false when one step below limit', () => {
        const ctx = createInitialPolicyContext('student.normal');
        const modifiedCtx: StepPolicyContext = {
          ...ctx,
          totalStepsDone: 119, // One below 120
        };

        expect(hasReachedMaxSteps(modifiedCtx)).toBe(false);
      });
    });
  });

  describe('advancePolicyContext - basic flows', () => {
    describe('outcome: ok, below max limit', () => {
      it('should increment both counters', () => {
        const ctx = createInitialPolicyContext('student.normal');
        const originalCurrentStepIndex = ctx.currentStepIndex;
        const originalTotalStepsDone = ctx.totalStepsDone;

        const newCtx = advancePolicyContext(ctx, 'ok');

        // Check increments
        expect(newCtx.totalStepsDone).toBe(1);
        expect(newCtx.currentStepIndex).toBe(1);

        // Check immutability
        expect(ctx.currentStepIndex).toBe(originalCurrentStepIndex);
        expect(ctx.totalStepsDone).toBe(originalTotalStepsDone);
        expect(ctx.currentStepIndex).toBe(0);
        expect(ctx.totalStepsDone).toBe(0);
      });

      it('should create a new context object', () => {
        const ctx = createInitialPolicyContext('student.normal');
        const newCtx = advancePolicyContext(ctx, 'ok');

        expect(newCtx).not.toBe(ctx);
      });
    });

    describe('outcome: error, below max limit', () => {
      it('should increment only totalStepsDone', () => {
        const ctx = createInitialPolicyContext('student.normal');
        const originalCurrentStepIndex = ctx.currentStepIndex;
        const originalTotalStepsDone = ctx.totalStepsDone;

        const newCtx = advancePolicyContext(ctx, 'error');

        // Check increments
        expect(newCtx.totalStepsDone).toBe(1);
        expect(newCtx.currentStepIndex).toBe(0);

        // Check immutability
        expect(ctx.currentStepIndex).toBe(originalCurrentStepIndex);
        expect(ctx.totalStepsDone).toBe(originalTotalStepsDone);
      });
    });

    describe('outcome: noStep', () => {
      it('should not increment any counters', () => {
        const ctx = createInitialPolicyContext('student.normal');
        const originalCurrentStepIndex = ctx.currentStepIndex;
        const originalTotalStepsDone = ctx.totalStepsDone;

        const newCtx = advancePolicyContext(ctx, 'noStep');

        // Check no increments
        expect(newCtx.totalStepsDone).toBe(0);
        expect(newCtx.currentStepIndex).toBe(0);

        // Check immutability
        expect(ctx.currentStepIndex).toBe(originalCurrentStepIndex);
        expect(ctx.totalStepsDone).toBe(originalTotalStepsDone);
      });
    });

    describe('multiple advances', () => {
      it('should accumulate counters correctly over multiple ok outcomes', () => {
        let ctx = createInitialPolicyContext('student.normal');

        ctx = advancePolicyContext(ctx, 'ok');
        expect(ctx.totalStepsDone).toBe(1);
        expect(ctx.currentStepIndex).toBe(1);

        ctx = advancePolicyContext(ctx, 'ok');
        expect(ctx.totalStepsDone).toBe(2);
        expect(ctx.currentStepIndex).toBe(2);

        ctx = advancePolicyContext(ctx, 'ok');
        expect(ctx.totalStepsDone).toBe(3);
        expect(ctx.currentStepIndex).toBe(3);
      });

      it('should handle mixed outcomes correctly', () => {
        let ctx = createInitialPolicyContext('student.normal');

        // ok: both increment
        ctx = advancePolicyContext(ctx, 'ok');
        expect(ctx.totalStepsDone).toBe(1);
        expect(ctx.currentStepIndex).toBe(1);

        // error: only totalStepsDone increments
        ctx = advancePolicyContext(ctx, 'error');
        expect(ctx.totalStepsDone).toBe(2);
        expect(ctx.currentStepIndex).toBe(1);

        // noStep: no increments
        ctx = advancePolicyContext(ctx, 'noStep');
        expect(ctx.totalStepsDone).toBe(2);
        expect(ctx.currentStepIndex).toBe(1);

        // ok: both increment again
        ctx = advancePolicyContext(ctx, 'ok');
        expect(ctx.totalStepsDone).toBe(3);
        expect(ctx.currentStepIndex).toBe(2);
      });
    });
  });

  describe('advancePolicyContext - with maxStepsInSession', () => {
    describe('at limit', () => {
      it('should not increment counters for ok outcome when limit reached', () => {
        const ctx = createInitialPolicyContext('student.micro');
        const ctxAtLimit: StepPolicyContext = {
          ...ctx,
          totalStepsDone: 80, // At maxStepsInSession
          currentStepIndex: 80,
        };

        const newCtx = advancePolicyContext(ctxAtLimit, 'ok');

        expect(newCtx.totalStepsDone).toBe(80);
        expect(newCtx.currentStepIndex).toBe(80);
      });

      it('should not increment counters for error outcome when limit reached', () => {
        const ctx = createInitialPolicyContext('student.micro');
        const ctxAtLimit: StepPolicyContext = {
          ...ctx,
          totalStepsDone: 80,
          currentStepIndex: 75,
        };

        const newCtx = advancePolicyContext(ctxAtLimit, 'error');

        expect(newCtx.totalStepsDone).toBe(80);
        expect(newCtx.currentStepIndex).toBe(75);
      });

      it('should preserve immutability at limit', () => {
        const ctx = createInitialPolicyContext('student.micro');
        const ctxAtLimit: StepPolicyContext = {
          ...ctx,
          totalStepsDone: 80,
          currentStepIndex: 80,
        };

        advancePolicyContext(ctxAtLimit, 'ok');

        // Original should be unchanged
        expect(ctxAtLimit.totalStepsDone).toBe(80);
        expect(ctxAtLimit.currentStepIndex).toBe(80);
      });
    });

    describe('one step before limit', () => {
      it('should reach limit after one ok outcome', () => {
        const ctx = createInitialPolicyContext('student.micro');
        const ctxNearLimit: StepPolicyContext = {
          ...ctx,
          totalStepsDone: 79, // One below maxStepsInSession (80)
          currentStepIndex: 79,
        };

        expect(hasReachedMaxSteps(ctxNearLimit)).toBe(false);

        const newCtx = advancePolicyContext(ctxNearLimit, 'ok');

        expect(newCtx.totalStepsDone).toBe(80);
        expect(newCtx.currentStepIndex).toBe(80);
        expect(hasReachedMaxSteps(newCtx)).toBe(true);
      });

      it('should allow increment and then freeze at limit', () => {
        let ctx = createInitialPolicyContext('student.micro');
        ctx = {
          ...ctx,
          totalStepsDone: 79,
          currentStepIndex: 79,
        };

        // First advance: should increment to 80
        ctx = advancePolicyContext(ctx, 'ok');
        expect(ctx.totalStepsDone).toBe(80);
        expect(ctx.currentStepIndex).toBe(80);
        expect(hasReachedMaxSteps(ctx)).toBe(true);

        // Second advance: should not increment (frozen)
        ctx = advancePolicyContext(ctx, 'ok');
        expect(ctx.totalStepsDone).toBe(80);
        expect(ctx.currentStepIndex).toBe(80);
      });
    });

    describe('above limit', () => {
      it('should not increment when already above limit', () => {
        const ctx = createInitialPolicyContext('student.micro');
        const ctxAboveLimit: StepPolicyContext = {
          ...ctx,
          totalStepsDone: 100, // Well above 80
          currentStepIndex: 90,
        };

        const newCtx = advancePolicyContext(ctxAboveLimit, 'ok');

        expect(newCtx.totalStepsDone).toBe(100);
        expect(newCtx.currentStepIndex).toBe(90);
      });
    });
  });

  describe('Immutability checks', () => {
    it('should never mutate the input context', () => {
      const ctx = createInitialPolicyContext('student.normal');

      // Capture original values
      const originalCurrentStepIndex = ctx.currentStepIndex;
      const originalTotalStepsDone = ctx.totalStepsDone;
      const originalConfig = ctx.config;

      // Advance with various outcomes
      advancePolicyContext(ctx, 'ok');
      advancePolicyContext(ctx, 'error');
      advancePolicyContext(ctx, 'noStep');

      // Verify original context is unchanged
      expect(ctx.currentStepIndex).toBe(originalCurrentStepIndex);
      expect(ctx.totalStepsDone).toBe(originalTotalStepsDone);
      expect(ctx.config).toBe(originalConfig);
      expect(ctx.currentStepIndex).toBe(0);
      expect(ctx.totalStepsDone).toBe(0);
    });

    it('should return a different object reference', () => {
      const ctx = createInitialPolicyContext('student.normal');
      const newCtx = advancePolicyContext(ctx, 'ok');

      expect(newCtx).not.toBe(ctx);
      expect(newCtx.config).toBe(ctx.config); // Config can be shared
    });

    it('should maintain immutability through chained operations', () => {
      const ctx1 = createInitialPolicyContext('student.normal');
      const ctx2 = advancePolicyContext(ctx1, 'ok');
      const ctx3 = advancePolicyContext(ctx2, 'ok');

      // All contexts should be distinct
      expect(ctx1).not.toBe(ctx2);
      expect(ctx2).not.toBe(ctx3);
      expect(ctx1).not.toBe(ctx3);

      // Original should be unchanged
      expect(ctx1.totalStepsDone).toBe(0);
      expect(ctx1.currentStepIndex).toBe(0);

      // Each should have correct