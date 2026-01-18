/**
 * @module decision.session
 *
 * Session-level orchestrator that wires together MapMaster and StepMaster
 * to provide a single-tick "one-click = one step" teaching session flow.
 *
 * This module is pure TypeScript with no I/O dependencies - all state is
 * passed in and returned, enabling easy testing and composition.
 */

import type {
  MapMasterRequest,
  MapMasterPlan,
  MapMasterRuleProvider,
  MapMasterExpressionInfo,
  MapMasterClientEvent,
  TsaSelectionInfo,
  MapMasterPolicy,
  MapMasterMode,
  EngineExpressionView,
  InvariantSetId,
  EngineTargetId,
  MapMasterCoreOptions,
  ScenarioId,
  MapMasterStepCandidate,
} from './mapmaster.core';

import type {
  StepMasterInput,
  StepMasterResult,
  StepHistory,
  StepHistoryEntry,
  StepExpressionContext,
  StepMasterClientEvent,
  StepSelectionContext,
  StepPolicyContext,
  StepMasterCoreOptions,
} from './stepmaster.core';

import { BasicMapMaster } from './mapmaster.core';
import { BasicStepMaster } from './stepmaster.core';
import { createDefaultStepScoringService } from './stepmaster.scoring-service';

import {
  buildIntrospectSummary,
  type MapMasterIntrospectSummary,
} from './mapmaster.introspect';

import {
  buildStepMasterIntrospectSummary,
  type StepMasterIntrospectSummary,
} from './stepmaster.introspect';

/**
 * Expression payload for a decision session request.
 * Contains all necessary information about the current mathematical expression.
 */
export interface DecisionSessionExpressionPayload {
  expressionId: string;
  latex: string;
  invariantSetId: InvariantSetId;
  engineView?: EngineExpressionView;
}

/**
 * Policy configuration for both MapMaster and StepMaster.
 * Encapsulates constraints and preferences for the decision-making process.
 */
export interface DecisionSessionPolicyConfig {
  mapMaxCandidates: number;
  stepPolicy: StepPolicyContext;
}

/**
 * Client event payload that encapsulates both MapMaster and StepMaster events.
 * Represents a single user interaction (click, keyboard, etc.).
 */
export interface DecisionSessionClientEvent {
  timestamp: number;
  mapEvent: MapMasterClientEvent;
  stepEvent: StepMasterClientEvent;
  tsaSelection: TsaSelectionInfo;
}

/**
 * Session state maintained across decision requests.
 * Currently contains only the step history, but can be extended.
 */
export interface DecisionSessionState {
  history: StepHistory;
}

/**
 * Complete request for a single decision session tick.
 * Contains expression, client interaction, policy, and optional scenario ID.
 */
export interface DecisionSessionRequest {
  mode: MapMasterMode;
  expression: DecisionSessionExpressionPayload;
  client: DecisionSessionClientEvent;
  policy: DecisionSessionPolicyConfig;
  scenarioId?: ScenarioId;
}

/**
 * Student-facing summary of the chosen step.
 * Provides minimal information needed to present the step to the user.
 */
export interface DecisionSessionChosenStepSummary {
  candidateId: string;
  invariantId?: string;
  shortStudent?: string;
  teacher?: string;
}

/**
 * Complete result of a decision session tick.
 * Includes updated state, planning and scoring results, introspection data,
 * and a student-facing summary of the chosen step.
 */
export interface DecisionSessionResult {
  state: DecisionSessionState;
  mapPlan: MapMasterPlan;
  stepResult: StepMasterResult;
  mapIntrospect: MapMasterIntrospectSummary;
  stepIntrospect: StepMasterIntrospectSummary;
  chosenStepSummary?: DecisionSessionChosenStepSummary;
}

/**
 * Dependencies required by DecisionSessionService.
 * Allows for easy testing and configuration.
 */
export interface DecisionSessionDeps {
  ruleProvider: MapMasterRuleProvider;
  mapMasterOptions?: MapMasterCoreOptions;
  stepMasterOptions?: StepMasterCoreOptions;
}

/**
 * Pure session-level orchestrator that coordinates MapMaster and StepMaster.
 *
 * This service is stateless at the class level - all session state is passed
 * in via requests and returned in results. This design enables:
 * - Easy unit testing with mock dependencies
 * - Predictable, deterministic behavior
 * - Simple integration with various backends (HTTP, GraphQL, etc.)
 *
 * The service orchestrates a single decision cycle:
 * 1. Generate step candidates via MapMaster
 * 2. Score and choose the best step via StepMaster
 * 3. Update session history
 * 4. Generate introspection data for debugging/analysis
 */
export class DecisionSessionService {
  constructor(private readonly deps: DecisionSessionDeps) {}

  /**
   * Execute a single decision cycle: plan candidates, choose a step,
   * update history, and generate introspection summaries.
   *
   * This is the main entry point for the "one-click = one step" flow.
   *
   * @param req - Complete request with expression, client event, and policy
   * @param prevState - Previous session state (primarily history)
   * @returns Complete result including updated state and introspection data
   */
  runOnce(
    req: DecisionSessionRequest,
    prevState: DecisionSessionState,
  ): DecisionSessionResult {
    // Step 1: Build MapMasterRequest
    const mapReq = this.buildMapMasterRequest(req);

    // Step 2: Call MapMaster to generate candidates
    const mapMaster = new BasicMapMaster(
      this.deps.ruleProvider,
      this.deps.mapMasterOptions,
    );
    const mapPlan = mapMaster.planStep(mapReq);

    // Step 3: Build StepMasterInput
    const stepInput = this.buildStepMasterInput(req, mapPlan, prevState);

    // Step 4: Call StepMaster to choose the best step
    const scoringService = createDefaultStepScoringService();
    const stepMaster = new BasicStepMaster(
      scoringService,
      this.deps.stepMasterOptions,
    );
    const stepResult = stepMaster.chooseStep(stepInput);

    // Step 5: Update history
    const updatedHistory = this.updateHistory(
      prevState.history,
      stepResult,
      req.client.timestamp,
    );

    // Step 6: Build chosen step summary
    const chosenStepSummary = this.buildChosenStepSummary(stepResult);

    // Step 7: Build introspection summaries
    const mapIntrospect = buildIntrospectSummary({
      request: mapReq,
      plan: mapPlan,
      scenarioId: req.scenarioId ?? null,
    });

    const stepIntrospect = buildStepMasterIntrospectSummary({
      input: stepInput,
      result: stepResult,
      scenarioId: req.scenarioId ?? null,
    });

    // Step 8: Return complete result
    return {
      state: { history: updatedHistory },
      mapPlan,
      stepResult,
      mapIntrospect,
      stepIntrospect,
      chosenStepSummary,
    };
  }

  /**
   * Build a MapMasterRequest from the session request.
   * Maps session-level concepts to MapMaster-specific structures.
   */
  private buildMapMasterRequest(req: DecisionSessionRequest): MapMasterRequest {
    const expressionInfo: MapMasterExpressionInfo = {
      id: req.expression.expressionId,
      latex: req.expression.latex,
      displayVersion: undefined,
      invariantSetId: req.expression.invariantSetId,
    };

    const policy: MapMasterPolicy = {
      stepLevel: 'student',
      allowMultipleSteps: true,
      maxCandidates: req.policy.mapMaxCandidates,
    };

    return {
      mode: req.mode,
      expression: expressionInfo,
      clientEvent: req.client.mapEvent,
      tsaSelection: req.client.tsaSelection,
      policy,
      engineView: req.expression.engineView,
    };
  }

  /**
   * Build a StepMasterInput from the session request and MapMaster plan.
   * Converts session-level and MapMaster data into StepMaster format.
   */
  private buildStepMasterInput(
    req: DecisionSessionRequest,
    mapPlan: MapMasterPlan,
    prevState: DecisionSessionState,
  ): StepMasterInput {
    const expression: StepExpressionContext = {
      expressionId: req.expression.expressionId,
      latex: req.expression.latex,
      invariantSetId: req.expression.invariantSetId,
      engineView: req.expression.engineView,
    };

    const selection: StepSelectionContext = {
      primaryTsaRegionId: req.client.tsaSelection.primaryRegionId,
      allTsaRegionIds: req.client.tsaSelection.allRegionIds,
    };

    return {
      expression,
      plan: mapPlan,
      history: prevState.history,
      clientEvent: req.client.stepEvent,
      policy: req.policy.stepPolicy,
      selection,
    };
  }

  /**
   * Update the step history based on the StepMaster result.
   * Creates a new history object without mutating the previous one.
   *
   * If a step was successfully chosen, adds an 'ok' entry.
   * Otherwise, the history remains unchanged (no entry for failed attempts).
   */
  private updateHistory(
    prevHistory: StepHistory,
    stepResult: StepMasterResult,
    timestamp: number,
  ): StepHistory {
    const entries = [...prevHistory.entries];

    // Only add a history entry if a step was successfully chosen
    if (
      stepResult.status === 'ok' &&
      stepResult.choice &&
      stepResult.chosenCandidate
    ) {
      const newEntry: StepHistoryEntry = {
        stepId: `step:${stepResult.expressionId}:${timestamp}`,
        expressionId: stepResult.expressionId,
        candidateId: stepResult.choice.candidateId,
        invariantId: stepResult.chosenCandidate.invariantId,
        timestamp,
        status: 'ok',
      };
      entries.push(newEntry);
    }

    return { entries };
  }

  /**
   * Build a student-facing summary of the chosen step.
   * Returns undefined if no step was chosen.
   */
  private buildChosenStepSummary(
    stepResult: StepMasterResult,
  ): DecisionSessionChosenStepSummary | undefined {
    if (
      stepResult.status === 'ok' &&
      stepResult.choice &&
      stepResult.chosenCandidate
    ) {
      return {
        candidateId: stepResult.choice.candidateId,
        invariantId: stepResult.chosenCandidate.invariantId,
        shortStudent:
          stepResult.chosenCandidate.description.shortStudent,
        teacher: stepResult.chosenCandidate.description.teacher,
      };
    }

    return undefined;
  }
}