import { describe, it, expect } from 'vitest';

import {
  mapStepMasterStatusToOutcome,
  buildStepId,
  buildEntryFromResult,
  appendStepFromResult,
  type AppendStepFromResultInput,
} from '../src/stepmaster.history-service';

import type {
  StepHistory,
  StepHistoryEntry,
  StepOutcomeStatus,
  StepMasterResult,
} from '../src/stepmaster.core';

/**
 * Helper to create a minimal StepMasterResult for testing.
 */
function createStepResult(overrides: {
  status?: 'ok' | 'noCandidates' | 'scoringFailed';
  expressionId?: string;
  requestId?: string;
  sessionId?: string;
  chosenCandidate?: {
    id: string;
    kind: string;
    invariantId: string;
  };
  choice?: {
    candidateId: string;
    totalScore: number;
    flags: string[];
  };
} = {}): StepMasterResult {
  return {
    status: overrides.status ?? 'ok',
    expressionId: overrides.expressionId ?? 'expr-default',
    requestId: overrides.requestId ?? 'req-default',
    sessionId: overrides.sessionId ?? 'session-default',
    engineTarget: 'engine-default',
    chosenCandidate: overrides.chosenCandidate,
    choice: overrides.choice,
    scores: [],
    messages: [],
  };
}

describe('stepmaster.history-service', () => {
  describe('mapStepMasterStatusToOutcome', () => {
    it('should map ok to ok', () => {
      const outcome = mapStepMasterStatusToOutcome('ok');
      expect(outcome).toBe('ok');
    });

    it('should map noCandidates to noStep', () => {
      const outcome = mapStepMasterStatusToOutcome('noCandidates');
      expect(outcome).toBe('noStep');
    });

    it('should map scoringFailed to error', () => {
      const outcome = mapStepMasterStatusToOutcome('scoringFailed');
      expect(outcome).toBe('error');
    });
  });

  describe('buildStepId', () => {
    it('should format step ID with all components', () => {
      const id = buildStepId('expr-123', 5, 1700000000000);
      expect(id).toBe('step:expr-123:5:1700000000000');
    });

    it('should use "unknown" when expressionId is empty', () => {
      const id = buildStepId('', 0, 1700000000000);
      expect(id).toBe('step:unknown:0:1700000000000');
    });

    it('should normalize negative stepIndex to 0', () => {
      const id = buildStepId('expr-test', -5, 1700000000000);
      expect(id).toBe('step:expr-test:0:1700000000000');
    });

    it('should handle stepIndex of 0', () => {
      const id = buildStepId('expr-first', 0, 1700000000000);
      expect(id).toBe('step:expr-first:0:1700000000000');
    });

    it('should handle large stepIndex values', () => {
      const id = buildStepId('expr-many', 999, 1700000000000);
      expect(id).toBe('step:expr-many:999:1700000000000');
    });

    it('should preserve expressionId exactly when non-empty', () => {
      const id = buildStepId('expr:with:colons', 0, 1700000000000);
      expect(id).toBe('step:expr:with:colons:0:1700000000000');
    });
  });

  describe('buildEntryFromResult', () => {
    it('should build entry with all fields when choice and candidate are present', () => {
      const result = createStepResult({
        status: 'ok',
        expressionId: 'expr-complete',
        chosenCandidate: {
          id: 'cand-1',
          kind: 'simplify',
          invariantId: 'inv-rule-1',
        },
        choice: {
          candidateId: 'cand-1',
          totalScore: 95.5,
          flags: ['DIRECT'],
        },
      });

      const entry = buildEntryFromResult(
        result,
        'ok',
        'step:expr-complete:0:1700000000000',
        1700000000000,
      );

      expect(entry.stepId).toBe('step:expr-complete:0:1700000000000');
      expect(entry.expressionId).toBe('expr-complete');
      expect(entry.candidateId).toBe('cand-1');
      expect(entry.invariantId).toBe('inv-rule-1');
      expect(entry.timestamp).toBe(1700000000000);
      expect(entry.status).toBe('ok');
    });

    it('should leave candidateId undefined when choice is missing', () => {
      const result = createStepResult({
        status: 'noCandidates',
        expressionId: 'expr-no-choice',
        chosenCandidate: undefined,
        choice: undefined,
      });

      const entry = buildEntryFromResult(
        result,
        'noStep',
        'step:expr-no-choice:0:1700000000000',
        1700000000000,
      );

      expect(entry.candidateId).toBeUndefined();
      expect(entry.invariantId).toBeUndefined();
      expect(entry.status).toBe('noStep');
    });

    it('should leave invariantId undefined when chosenCandidate is missing', () => {
      const result = createStepResult({
        status: 'scoringFailed',
        expressionId: 'expr-error',
        chosenCandidate: undefined,
        choice: {
          candidateId: 'cand-orphan',
          totalScore: 50,
          flags: [],
        },
      });

      const entry = buildEntryFromResult(
        result,
        'error',
        'step:expr-error:0:1700000000000',
        1700000000000,
      );

      expect(entry.candidateId).toBe('cand-orphan');
      expect(entry.invariantId).toBeUndefined();
      expect(entry.status).toBe('error');
    });

    it('should preserve expressionId even when empty', () => {
      const result = createStepResult({
        expressionId: '',
      });

      const entry = buildEntryFromResult(
        result,
        'ok',
        'step:unknown:0:1700000000000',
        1700000000000,
      );

      expect(entry.expressionId).toBe('');
    });
  });

  describe('appendStepFromResult - ok status', () => {
    it('should append entry to empty history', () => {
      const history: StepHistory = { entries: [] };
      const result = createStepResult({
        status: 'ok',
        expressionId: 'expr:test',
        chosenCandidate: {
          id: 'cand-1',
          kind: 'simplify',
          invariantId: 'inv-add-like-terms',
        },
        choice: {
          candidateId: 'cand-1',
          totalScore: 90,
          flags: ['CLICK_DIRECT'],
        },
      });

      const input: AppendStepFromResultInput = {
        history,
        result,
        timestamp: 1700000000000,
      };

      const newHistory = appendStepFromResult(input);

      // Original history should be unchanged
      expect(history.entries).toHaveLength(0);

      // New history should have one entry
      expect(newHistory.entries).toHaveLength(1);

      const entry = newHistory.entries[0];
      expect(entry.status).toBe('ok');
      expect(entry.expressionId).toBe('expr:test');
      expect(entry.candidateId).toBe('cand-1');
      expect(entry.invariantId).toBe('inv-add-like-terms');
      expect(entry.timestamp).toBe(1700000000000);
      expect(entry.stepId).toContain('step:expr:test:0:1700000000000');
    });

    it('should not mutate original history', () => {
      const history: StepHistory = { entries: [] };
      const result = createStepResult({
        status: 'ok',
        expressionId: 'expr-immutable',
      });

      const originalEntriesRef = history.entries;

      appendStepFromResult({
        history,
        result,
        timestamp: 1700000000000,
      });

      // Original reference should be unchanged
      expect(history.entries).toBe(originalEntriesRef);
      expect(history.entries).toHaveLength(0);
    });
  });

  describe('appendStepFromResult - noStep and error statuses', () => {
    it('should append noStep entry for noCandidates status', () => {
      const history: StepHistory = { entries: [] };
      const result = createStepResult({
        status: 'noCandidates',
        expressionId: 'expr-no-cand',
        chosenCandidate: undefined,
        choice: undefined,
      });

      const newHistory = appendStepFromResult({
        history,
        result,
        timestamp: 1700000001000,
      });

      expect(newHistory.entries).toHaveLength(1);
      const entry = newHistory.entries[0];
      expect(entry.status).toBe('noStep');
      expect(entry.candidateId).toBeUndefined();
      expect(entry.invariantId).toBeUndefined();
    });

    it('should append error entry for scoringFailed status', () => {
      const history: StepHistory = { entries: [] };
      const result = createStepResult({
        status: 'scoringFailed',
        expressionId: 'expr-error',
      });

      const newHistory = appendStepFromResult({
        history,
        result,
        timestamp: 1700000002000,
      });

      expect(newHistory.entries).toHaveLength(1);
      const entry = newHistory.entries[0];
      expect(entry.status).toBe('error');
    });
  });

  describe('appendStepFromResult - stepIndex calculation', () => {
    it('should use history length as stepIndex', () => {
      // Start with 2 existing entries
      const history: StepHistory = {
        entries: [
          {
            stepId: 'step:expr-1:0:1700000000000',
            expressionId: 'expr-1',
            timestamp: 1700000000000,
            status: 'ok',
          },
          {
            stepId: 'step:expr-2:1:1700000001000',
            expressionId: 'expr-2',
            timestamp: 1700000001000,
            status: 'ok',
          },
        ],
      };

      const result = createStepResult({
        expressionId: 'expr-3',
      });

      const newHistory = appendStepFromResult({
        history,
        result,
        timestamp: 1700000002000,
      });

      // Should have 3 entries now
      expect(newHistory.entries).toHaveLength(3);

      // The new entry should have stepIndex 2
      const newEntry = newHistory.entries[2];
      expect(newEntry.stepId).toContain(':2:');
      expect(newEntry.stepId).toBe('step:expr-3:2:1700000002000');

      // Original history should be unchanged
      expect(history.entries).toHaveLength(2);
    });

    it('should accumulate multiple steps correctly', () => {
      let history: StepHistory = { entries: [] };

      // First step
      history = appendStepFromResult({
        history,
        result: createStepResult({ expressionId: 'expr-a' }),
        timestamp: 1000,
      });
      expect(history.entries).toHaveLength(1);
      expect(history.entries[0].stepId).toBe('step:expr-a:0:1000');

      // Second step
      history = appendStepFromResult({
        history,
        result: createStepResult({ expressionId: 'expr-b' }),
        timestamp: 2000,
      });
      expect(history.entries).toHaveLength(2);
      expect(history.entries[1].stepId).toBe('step:expr-b:1:2000');

      // Third step
      history = appendStepFromResult({
        history,
        result: createStepResult({ expressionId: 'expr-c' }),
        timestamp: 3000,
      });
      expect(history.entries).toHaveLength(3);
      expect(history.entries[2].stepId).toBe('step:expr-c:2:3000');
    });
  });
});