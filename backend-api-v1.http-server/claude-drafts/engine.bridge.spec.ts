import { describe, it, expect } from 'vitest';

import {
  buildEngineExecutionRequest,
  type EngineExecutionRequest,
  type BuildEngineExecutionRequestInput,
} from '../src/engine.bridge';

import type {
  StepMasterResult,
  StepMasterStatus,
  StepChoice,
  StepMasterMessage,
  CandidateScoreDetail,
  StepReasonCode,
} from '../src/stepmaster.core';

import type {
  MapMasterStepCandidate,
  MapMasterStepDescription,
  MapMasterStepSelection,
  MapMasterStepSafety,
  EngineRequestDraft,
} from '../src/mapmaster.core';

/**
 * Helper to create a minimal but valid MapMasterStepCandidate.
 */
function createCandidate(
  id: string,
  invariantId: string,
  engineRequestOverrides: Partial<EngineRequestDraft> = {},
): MapMasterStepCandidate {
  const defaultEngineRequest: EngineRequestDraft = {
    operation: 'simplify',
    operands: ['x+x'],
    preview: false,
    ...engineRequestOverrides,
  };

  return {
    id,
    kind: 'simplify',
    invariantId,
    description: {
      shortStudent: `Short for ${id}`,
      longStudent: `Long for ${id}`,
      teacher: `Teacher for ${id}`,
    },
    selection: {
      surfaceRegionIds: ['surf1'],
      tsaRegionIds: ['tsa1'],
    },
    engineRequest: defaultEngineRequest,
    safety: {
      isSafe: true,
    },
  };
}

/**
 * Helper to create a minimal StepMasterResult.
 */
function createStepResult(overrides: {
  status?: StepMasterStatus;
  chosenCandidate?: MapMasterStepCandidate;
  choice?: StepChoice;
  expressionId?: string;
  requestId?: string;
  sessionId?: string;
  engineTarget?: string;
}): StepMasterResult {
  return {
    status: overrides.status ?? 'ok',
    expressionId: overrides.expressionId ?? 'expr-123',
    requestId: overrides.requestId ?? 'req-456',
    sessionId: overrides.sessionId ?? 'session-789',
    engineTarget: overrides.engineTarget ?? 'engine-target-1',
    chosenCandidate: overrides.chosenCandidate,
    choice: overrides.choice,
    scores: [],
    messages: [],
  };
}

describe('buildEngineExecutionRequest', () => {
  describe('Happy path - one candidate chosen', () => {
    it('should build a valid engine execution request with all metadata', () => {
      // Arrange
      const candidate = createCandidate('cand-1', 'inv-add-fractions', {
        operation: 'simplify',
        operands: ['1/3', '2/5'],
        preview: false,
        invariantRuleId: 'rule:add-fractions',
        stage1Before: '1/3 + 2/5',
      });

      const choice: StepChoice = {
        candidateId: 'cand-1',
        totalScore: 85.5,
        flags: ['CLICK_DIRECT', 'HISTORY_OK'],
      };

      const stepResult = createStepResult({
        status: 'ok',
        chosenCandidate: candidate,
        choice,
        expressionId: 'expr-fractions-001',
        requestId: 'req-fractions-002',
        sessionId: 'session-fractions-003',
        engineTarget: 'engine-math-v2',
      });

      const input: BuildEngineExecutionRequestInput = {
        stepResult,
        invariantSetId: 'inv-set-fractions',
      };

      // Act
      const result = buildEngineExecutionRequest(input);

      // Assert
      expect(result).not.toBeNull();
      expect(result).toBeDefined();

      // Check metadata fields
      expect(result!.meta.requestId).toBe('req-fractions-002');
      expect(result!.meta.sessionId).toBe('session-fractions-003');
      expect(result!.meta.expressionId).toBe('expr-fractions-001');
      expect(result!.meta.engineTarget).toBe('engine-math-v2');
      expect(result!.meta.stepStatus).toBe('ok');
      expect(result!.meta.stepCandidateId).toBe('cand-1');
      expect(result!.meta.stepReasonFlags).toEqual(['CLICK_DIRECT', 'HISTORY_OK']);
      expect(result!.meta.invariantSetId).toBe('inv-set-fractions');
      expect(result!.meta.invariantRuleId).toBe('rule:add-fractions');

      // Check draft fields
      expect(result!.draft.operation).toBe('simplify');
      expect(result!.draft.operands).toEqual(['1/3', '2/5']);
      expect(result!.draft.preview).toBe(false);
      expect(result!.draft.stage1Before).toBe('1/3 + 2/5');
      expect(result!.draft.invariantRuleId).toBe('rule:add-fractions');
    });

    it('should handle missing optional fields gracefully', () => {
      // Arrange: Create candidate without optional fields
      const candidate = createCandidate('cand-2', 'inv-basic', {
        operation: 'combine',
        operands: ['2x', '3x'],
        // No invariantRuleId
        // No stage1Before
      });

      const choice: StepChoice = {
        candidateId: 'cand-2',
        totalScore: 70.0,
        flags: [], // Empty flags
      };

      const stepResult = createStepResult({
        chosenCandidate: candidate,
        choice,
      });

      const input: BuildEngineExecutionRequestInput = {
        stepResult,
        // No invariantSetId
      };

      // Act
      const result = buildEngineExecutionRequest(input);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.meta.stepReasonFlags).toEqual([]);
      expect(result!.meta.invariantSetId).toBeUndefined();
      expect(result!.meta.invariantRuleId).toBeUndefined();
    });

    it('should handle string operands (not array)', () => {
      // Arrange
      const candidate = createCandidate('cand-3', 'inv-string', {
        operation: 'expand',
        operands: 'single-string-operand', // String instead of array
      });

      const choice: StepChoice = {
        candidateId: 'cand-3',
        totalScore: 90.0,
        flags: ['DIRECT'],
      };

      const stepResult = createStepResult({
        chosenCandidate: candidate,
        choice,
      });

      const input: BuildEngineExecutionRequestInput = {
        stepResult,
      };

      // Act
      const result = buildEngineExecutionRequest(input);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.draft.operands).toBe('single-string-operand');
    });
  });

  describe('Non-ok status → null', () => {
    it('should return null for noCandidates status', () => {
      // Arrange
      const stepResult = createStepResult({
        status: 'noCandidates',
        chosenCandidate: undefined,
        choice: undefined,
      });

      const input: BuildEngineExecutionRequestInput = {
        stepResult,
        invariantSetId: 'inv-set-1',
      };

      // Act
      const result = buildEngineExecutionRequest(input);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for scoringFailed status', () => {
      // Arrange
      const stepResult = createStepResult({
        status: 'scoringFailed',
        chosenCandidate: undefined,
        choice: undefined,
      });

      const input: BuildEngineExecutionRequestInput = {
        stepResult,
        invariantSetId: 'inv-set-1',
      };

      // Act
      const result = buildEngineExecutionRequest(input);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null even if status is non-ok but candidate exists', () => {
      // Arrange: Inconsistent state (shouldn't happen in practice)
      const candidate = createCandidate('cand-4', 'inv-test');
      const choice: StepChoice = {
        candidateId: 'cand-4',
        totalScore: 80.0,
        flags: ['TEST'],
      };

      const stepResult = createStepResult({
        status: 'noCandidates', // Wrong status
        chosenCandidate: candidate,
        choice,
      });

      const input: BuildEngineExecutionRequestInput = {
        stepResult,
      };

      // Act
      const result = buildEngineExecutionRequest(input);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('Missing chosenCandidate → null', () => {
    it('should return null when chosenCandidate is undefined', () => {
      // Arrange
      const choice: StepChoice = {
        candidateId: 'cand-5',
        totalScore: 75.0,
        flags: ['TEST'],
      };

      const stepResult = createStepResult({
        status: 'ok',
        chosenCandidate: undefined, // Missing candidate
        choice,
      });

      const input: BuildEngineExecutionRequestInput = {
        stepResult,
      };

      // Act
      const result = buildEngineExecutionRequest(input);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('Missing choice → null', () => {
    it('should return null when choice is undefined', () => {
      // Arrange
      const candidate = createCandidate('cand-6', 'inv-test');

      const stepResult = createStepResult({
        status: 'ok',
        chosenCandidate: candidate,
        choice: undefined, // Missing choice
      });

      const input: BuildEngineExecutionRequestInput = {
        stepResult,
      };

      // Act
      const result = buildEngineExecutionRequest(input);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('Immutability / no mutation', () => {
    it('should not mutate the original engineRequest when result draft is modified', () => {
      // Arrange
      const originalOperands = ['x', 'y'];
      const candidate = createCandidate('cand-7', 'inv-immutable', {
        operation: 'add',
        operands: originalOperands,
      });

      const choice: StepChoice = {
        candidateId: 'cand-7',
        totalScore: 100.0,
        flags: ['IMMUTABLE_TEST'],
      };

      const stepResult = createStepResult({
        chosenCandidate: candidate,
        choice,
      });

      const input: BuildEngineExecutionRequestInput = {
        stepResult,
      };

      // Keep reference to original operands
      const originalOperandsRef = candidate.engineRequest.operands;

      // Act
      const result = buildEngineExecutionRequest(input);

      // Mutate the returned draft's operands array
      if (Array.isArray(result!.draft.operands)) {
        result!.draft.operands.push('z');
      }

      // Assert: Original should be unchanged
      expect(originalOperandsRef).toEqual(['x', 'y']);
      expect(originalOperandsRef).toHaveLength(2);
      expect(candidate.engineRequest.operands).toEqual(['x', 'y']);
      expect(candidate.engineRequest.operands).toHaveLength(2);

      // The result should have the mutation
      expect(result!.draft.operands).toEqual(['x', 'y', 'z']);
      expect(result!.draft.operands).toHaveLength(3);
    });

    it('should not mutate original flags array', () => {
      // Arrange
      const originalFlags: StepReasonCode[] = ['FLAG_A', 'FLAG_B'];
      const candidate = createCandidate('cand-8', 'inv-flags');

      const choice: StepChoice = {
        candidateId: 'cand-8',
        totalScore: 95.0,
        flags: originalFlags,
      };

      const stepResult = createStepResult({
        chosenCandidate: candidate,
        choice,
      });

      const input: BuildEngineExecutionRequestInput = {
        stepResult,
      };

      // Act
      const result = buildEngineExecutionRequest(input);

      // Mutate the returned meta's flags
      result!.meta.stepReasonFlags?.push('FLAG_C');

      // Assert: Original should be unchanged
      expect(originalFlags).toEqual(['FLAG_A', 'FLAG_B']);
      expect(originalFlags).toHaveLength(2);
      expect(choice.flags).toEqual(['FLAG_A', 'FLAG_B']);
      expect(choice.flags).toHaveLength(2);

      // The result should have the mutation
      expect(result!.meta.stepReasonFlags).toEqual(['FLAG_A', 'FLAG_B', 'FLAG_C']);
      expect(result!.meta.stepReasonFlags).toHaveLength(3);
    });

    it('should create a shallow copy of draft object to prevent aliasing', () => {
      // Arrange
      const candidate = createCandidate('cand-9', 'inv-draft', {
        operation: 'simplify',
        operands: ['a', 'b'],
        preview: false,
      });

      const choice: StepChoice = {
        candidateId: 'cand-9',
        totalScore: 88.0,
        flags: ['COPY_TEST'],
      };

      const stepResult = createStepResult({
        chosenCandidate: candidate,
        choice,
      });

      const input: BuildEngineExecutionRequestInput = {
        stepResult,
      };

      // Act
      const result = buildEngineExecutionRequest(input);

      // Mutate the returned draft
      result!.draft.preview = true;
      result!.draft.operation = 'expand';

      // Assert: Original should be unchanged
      expect(candidate.engineRequest.preview).toBe(false);
      expect(candidate.engineRequest.operation).toBe('simplify');

      // The result should have the mutations
      expect(result!.draft.preview).toBe(true);
      expect(result!.draft.operation).toBe('expand');
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined flags gracefully', () => {
      // Arrange
      const candidate = createCandidate('cand-10', 'inv-no-flags');

      // Create choice with undefined flags (simulate optional field)
      const choice: StepChoice = {
        candidateId: 'cand-10',
        totalScore: 60.0,
        flags: undefined as any, // Explicitly undefined
      };

      const stepResult = createStepResult({
        chosenCandidate: candidate,
        choice,
      });

      const input: BuildEngineExecutionRequestInput = {
        stepResult,
      };

      // Act
      const result = buildEngineExecutionRequest(input);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.meta.stepReasonFlags).toEqual([]);
    });

    it('should preserve extra fields in engineRequest', () => {
      // Arrange
      const candidate = createCandidate('cand-11', 'inv-extra', {
        operation: 'custom',
        operands: ['1', '2'],
        customField: 'custom-value',
        anotherField: 42,
      } as any);

      const choice: StepChoice = {
        candidateId: 'cand-11',
        totalScore: 77.0,
        flags: ['CUSTOM'],
      };

      const stepResult = createStepResult({
        chosenCandidate: candidate,
        choice,
      });

      const input: BuildEngineExecutionRequestInput = {
        stepResult,
      };

      // Act
      const result = buildEngineExecutionRequest(input);

      // Assert
      expect(result).not.toBeNull();
      expect((result!.draft as any).customField).toBe('custom-value');
      expect((result!.draft as any).anotherField).toBe(42);
    });
  });
});