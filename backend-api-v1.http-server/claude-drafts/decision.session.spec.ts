import { describe, it, expect } from 'vitest';
import {
  DecisionSessionService,
  type DecisionSessionRequest,
  type DecisionSessionState,
  type DecisionSessionExpressionPayload,
  type DecisionSessionPolicyConfig,
  type DecisionSessionClientEvent,
  type DecisionSessionDeps,
} from '../src/decision.session';

import type {
  MapMasterRequest,
  MapMasterRuleProvider,
  MapMasterStepCandidate,
  MapMasterClientEvent,
  TsaSelectionInfo,
} from '../src/mapmaster.core';

import type {
  StepPolicyContext,
  StepMasterClientEvent,
} from '../src/stepmaster.core';

/**
 * Fake MapMasterRuleProvider for testing.
 * Returns a configurable list of candidates.
 */
class FakeRuleProvider implements MapMasterRuleProvider {
  constructor(private candidates: MapMasterStepCandidate[]) {}

  buildCandidates(_request: MapMasterRequest): MapMasterStepCandidate[] {
    return this.candidates;
  }
}

/**
 * Helper to create a minimal but valid MapMasterStepCandidate.
 */
function createCandidate(
  id: string,
  invariantId: string,
  kind: string = 'simplify',
): MapMasterStepCandidate {
  return {
    id,
    kind,
    invariantId,
    description: {
      shortStudent: `Short description for ${id}`,
      longStudent: `Long description for ${id}`,
      teacher: `Teacher note for ${id}`,
    },
    selection: {
      surfaceRegionIds: ['region1'],
      tsaRegionIds: ['tsa1'],
    },
    engineRequest: {
      operation: 'simplify',
      operands: ['x+x'],
    },
    safety: {
      isSafe: true,
    },
  };
}

/**
 * Helper to create a minimal DecisionSessionRequest.
 */
function createRequest(overrides: {
  timestamp?: number;
  expressionId?: string;
  scenarioId?: string;
  mapMaxCandidates?: number;
} = {}): DecisionSessionRequest {
  const timestamp = overrides.timestamp ?? 1000;
  const expressionId = overrides.expressionId ?? 'expr1';

  const expression: DecisionSessionExpressionPayload = {
    expressionId,
    latex: '2x + 2x',
    invariantSetId: 'inv-set-1',
  };

  const mapEvent: MapMasterClientEvent = {
    type: 'click',
    timestamp,
    latex: '2x + 2x',
    surfaceNodeId: 'node1',
    click: {
      button: 'left',
      clickCount: 1,
      modifiers: {
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      },
    },
  };

  const stepEvent: StepMasterClientEvent = {
    type: 'click',
    timestamp,
    surfaceNodeId: 'node1',
    tsaRegionId: 'tsa1',
    modifiers: {
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
    },
  };

  const tsaSelection: TsaSelectionInfo = {
    selectionMapVersion: 'v1',
    primaryRegionId: 'tsa1',
    allRegionIds: ['tsa1'],
  };

  const client: DecisionSessionClientEvent = {
    timestamp,
    mapEvent,
    stepEvent,
    tsaSelection,
  };

  const stepPolicy: StepPolicyContext = {
    config: {
      id: 'default-policy',
      granularity: 'normal',
      preferClickedRegion: true,
      allowCrossRegionSteps: false,
      allowMultiPrimitiveSteps: false,
    },
    currentStepIndex: 0,
    totalStepsDone: 0,
  };

  const policy: DecisionSessionPolicyConfig = {
    mapMaxCandidates: overrides.mapMaxCandidates ?? 10,
    stepPolicy,
  };

  return {
    mode: 'apply',
    expression,
    client,
    policy,
    scenarioId: overrides.scenarioId,
  };
}

/**
 * Helper to create an empty DecisionSessionState.
 */
function createEmptyState(): DecisionSessionState {
  return {
    history: {
      entries: [],
    },
  };
}

describe('DecisionSessionService', () => {
  describe('Happy path - step chosen', () => {
    it('should choose a step and update history when candidates are available', () => {
      // Arrange: Create 3 candidates
      const candidates = [
        createCandidate('cand1', 'inv1', 'simplify'),
        createCandidate('cand2', 'inv2', 'combine'),
        createCandidate('cand3', 'inv3', 'factor'),
      ];

      const ruleProvider = new FakeRuleProvider(candidates);
      const deps: DecisionSessionDeps = { ruleProvider };
      const service = new DecisionSessionService(deps);

      const request = createRequest({ timestamp: 2000 });
      const prevState = createEmptyState();

      // Act
      const result = service.runOnce(request, prevState);

      // Assert
      expect(result.stepResult.status).toBe('ok');
      expect(result.stepResult.chosenCandidate).toBeDefined();
      expect(result.stepResult.choice).toBeDefined();

      // History should have one new entry
      expect(result.state.history.entries).toHaveLength(1);
      const historyEntry = result.state.history.entries[0];
      expect(historyEntry.status).toBe('ok');
      expect(historyEntry.timestamp).toBe(2000);
      expect(historyEntry.expressionId).toBe('expr1');
      expect(historyEntry.candidateId).toBe(result.stepResult.choice!.candidateId);
      expect(historyEntry.invariantId).toBe(
        result.stepResult.chosenCandidate!.invariantId,
      );

      // Chosen step summary should be defined
      expect(result.chosenStepSummary).toBeDefined();
      expect(result.chosenStepSummary!.candidateId).toBe(
        result.stepResult.choice!.candidateId,
      );
      expect(result.chosenStepSummary!.invariantId).toBe(
        result.stepResult.chosenCandidate!.invariantId,
      );
      expect(result.chosenStepSummary!.shortStudent).toBeDefined();
      expect(result.chosenStepSummary!.teacher).toBeDefined();

      // MapMaster plan should have candidates
      expect(result.mapPlan.candidates).toHaveLength(3);

      // Introspection summaries should be populated
      expect(result.mapIntrospect.candidates).toHaveLength(3);
      expect(result.stepIntrospect.candidates).toHaveLength(3);
      expect(result.stepIntrospect.chosenCandidateId).toBe(
        result.stepResult.choice!.candidateId,
      );
    });

    it('should include scenario ID in introspection when provided', () => {
      // Arrange
      const candidates = [createCandidate('cand1', 'inv1')];
      const ruleProvider = new FakeRuleProvider(candidates);
      const service = new DecisionSessionService({ ruleProvider });

      const request = createRequest({ scenarioId: 'test-scenario-123' });
      const prevState = createEmptyState();

      // Act
      const result = service.runOnce(request, prevState);

      // Assert
      expect(result.mapIntrospect.scenarioId).toBe('test-scenario-123');
      expect(result.stepIntrospect.scenarioId).toBe('test-scenario-123');
    });
  });

  describe('No candidates from MapMaster', () => {
    it('should return noCandidates status when rule provider returns empty array', () => {
      // Arrange: No candidates
      const ruleProvider = new FakeRuleProvider([]);
      const deps: DecisionSessionDeps = { ruleProvider };
      const service = new DecisionSessionService(deps);

      const request = createRequest({ timestamp: 3000 });
      const prevState = createEmptyState();

      // Act
      const result = service.runOnce(request, prevState);

      // Assert
      expect(result.stepResult.status).toBe('noCandidates');
      expect(result.stepResult.chosenCandidate).toBeUndefined();
      expect(result.stepResult.choice).toBeUndefined();

      // History should remain empty (no entry added for failed attempts)
      expect(result.state.history.entries).toHaveLength(0);

      // Chosen step summary should be undefined
      expect(result.chosenStepSummary).toBeUndefined();

      // MapMaster plan should have no candidates
      expect(result.mapPlan.candidates).toHaveLength(0);

      // Introspection should reflect the empty state
      expect(result.mapIntrospect.candidates).toHaveLength(0);
      expect(result.stepIntrospect.candidates).toHaveLength(0);
      expect(result.stepIntrospect.chosenCandidateId).toBeUndefined();
    });
  });

  describe('Step below threshold scenario', () => {
    it('should not choose a step when minTotalScoreToChoose is too high', () => {
      // Arrange: Create candidates but set threshold impossibly high
      const candidates = [
        createCandidate('cand1', 'inv1'),
        createCandidate('cand2', 'inv2'),
      ];

      const ruleProvider = new FakeRuleProvider(candidates);
      const deps: DecisionSessionDeps = {
        ruleProvider,
        stepMasterOptions: {
          minTotalScoreToChoose: 1000000, // Impossibly high threshold
        },
      };
      const service = new DecisionSessionService(deps);

      const request = createRequest({ timestamp: 4000 });
      const prevState = createEmptyState();

      // Act
      const result = service.runOnce(request, prevState);

      // Assert
      expect(result.stepResult.status).toBe('noCandidates');
      expect(result.stepResult.chosenCandidate).toBeUndefined();
      expect(result.stepResult.choice).toBeUndefined();

      // History should remain empty
      expect(result.state.history.entries).toHaveLength(0);

      // Chosen step summary should be undefined
      expect(result.chosenStepSummary).toBeUndefined();

      // MapMaster should have generated candidates
      expect(result.mapPlan.candidates).toHaveLength(2);

      // StepMaster should have scored them but not chosen any
      expect(result.stepIntrospect.candidates).toHaveLength(2);
      expect(result.stepIntrospect.chosenCandidateId).toBeUndefined();
    });
  });

  describe('History accumulation', () => {
    it('should accumulate history entries across multiple runOnce calls', () => {
      // Arrange: Create service with candidates
      const candidates1 = [createCandidate('cand1', 'inv1')];
      const ruleProvider1 = new FakeRuleProvider(candidates1);
      const service = new DecisionSessionService({ ruleProvider: ruleProvider1 });

      const request1 = createRequest({ timestamp: 5000, expressionId: 'expr1' });
      const prevState1 = createEmptyState();

      // Act: First call
      const result1 = service.runOnce(request1, prevState1);

      // Assert: First history entry
      expect(result1.state.history.entries).toHaveLength(1);
      expect(result1.state.history.entries[0].expressionId).toBe('expr1');
      expect(result1.state.history.entries[0].timestamp).toBe(5000);

      // Arrange: Second call with different candidates and updated state
      const candidates2 = [createCandidate('cand2', 'inv2')];
      const ruleProvider2 = new FakeRuleProvider(candidates2);
      const service2 = new DecisionSessionService({ ruleProvider: ruleProvider2 });

      const request2 = createRequest({ timestamp: 6000, expressionId: 'expr2' });

      // Act: Second call, passing previous state
      const result2 = service2.runOnce(request2, result1.state);

      // Assert: History should have both entries
      expect(result2.state.history.entries).toHaveLength(2);
      expect(result2.state.history.entries[0].expressionId).toBe('expr1');
      expect(result2.state.history.entries[0].timestamp).toBe(5000);
      expect(result2.state.history.entries[1].expressionId).toBe('expr2');
      expect(result2.state.history.entries[1].timestamp).toBe(6000);

      // Original state should remain unchanged (immutability check)
      expect(result1.state.history.entries).toHaveLength(1);
    });

    it('should not mutate previous history when creating new entries', () => {
      // Arrange
      const candidates = [createCandidate('cand1', 'inv1')];
      const ruleProvider = new FakeRuleProvider(candidates);
      const service = new DecisionSessionService({ ruleProvider });

      const request = createRequest({ timestamp: 7000 });
      const prevState = createEmptyState();

      // Capture original entries array reference
      const originalEntries = prevState.history.entries;

      // Act
      const result = service.runOnce(request, prevState);

      // Assert: Original array should be unchanged
      expect(originalEntries).toHaveLength(0);
      expect(result.state.history.entries).toHaveLength(1);
      expect(result.state.history.entries).not.toBe(originalEntries);
    });
  });

  describe('Policy configuration', () => {
    it('should respect mapMaxCandidates policy', () => {
      // Arrange: Create many candidates
      const candidates = Array.from({ length: 20 }, (_, i) =>
        createCandidate(`cand${i}`, `inv${i}`),
      );

      const ruleProvider = new FakeRuleProvider(candidates);
      const service = new DecisionSessionService({
        ruleProvider,
        mapMasterOptions: {
          hardMaxCandidates: 5, // Limit to 5 candidates
        },
      });

      const request = createRequest({ mapMaxCandidates: 3 });
      const prevState = createEmptyState();

      // Act
      const result = service.runOnce(request, prevState);

      // Assert: Should respect the hard limit
      expect(result.mapPlan.candidates.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Edge cases', () => {
    it('should handle request with minimal data', () => {
      // Arrange
      const candidates = [createCandidate('cand1', 'inv1')];
      const ruleProvider = new FakeRuleProvider(candidates);
      const service = new DecisionSessionService({ ruleProvider });

      const request = createRequest();
      const prevState = createEmptyState();

      // Act
      const result = service.runOnce(request, prevState);

      // Assert: Should complete successfully
      expect(result.stepResult.status).toBe('ok');
      expect(result.state.history.entries).toHaveLength(1);
    });

    it('should generate unique step IDs for different timestamps', () => {
      // Arrange
      const candidates = [createCandidate('cand1', 'inv1')];
      const ruleProvider = new FakeRuleProvider(candidates);
      const service = new DecisionSessionService({ ruleProvider });

      const request1 = createRequest({ timestamp: 1000 });
      const request2 = createRequest({ timestamp: 2000 });
      const prevState = createEmptyState();

      // Act
      const result1 = service.runOnce(request1, prevState);
      const result2 = service.runOnce(request2, result1.state);

      // Assert: Step IDs should be different
      const stepId1 = result2.state.history.entries[0].stepId;
      const stepId2 = result2.state.history.entries[1].stepId;
      expect(stepId1).not.toBe(stepId2);
      expect(stepId1).toContain('1000');
      expect(stepId2).toContain('2000');
    });
  });
});