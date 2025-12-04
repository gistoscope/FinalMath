/**
 * Step Orchestrator (TzV1.1)
 *
 * Responsibilities:
 *  - Act as the central coordinator for a single step.
 *  - Talk to Invariants Registry, MapMaster, StepMaster, History, Engine Bridge.
 *  - Maintain per-request step history and policy.
 */

import {
    type InMemoryInvariantRegistry,
} from "../invariants/index";
import {
    mapMasterGenerate,
    type MapMasterInput,
} from "../mapmaster/index";
import {
    stepMasterDecide,
    stepMasterDecideFromMap,
    createDefaultStudentPolicy,
    type StepPolicyConfig,
    type StepMasterInput,
    type StepMasterMapInput,
} from "../stepmaster/index";
import {
    createEmptyHistory,
    appendStepFromResult,
    getSnapshot,
    type StepHistory,
    removeLastStep,
    updateLastStep,
} from "../stepmaster/index";
import {
    executeStepViaEngine,
    type EngineStepExecutionResult,
} from "../engine/index";
import { SessionService } from "../session/session.service";
import type { UserRole, HintRequest, HintResponse } from "../protocol/backend-step.types";
import { MapBuilder } from "../mapmaster/map-builder";
import { parseExpression } from "../mapmaster/ast";

export interface OrchestratorContext {
    invariantRegistry: InMemoryInvariantRegistry;
    policy: StepPolicyConfig;
}

export interface OrchestratorStepRequest {
    sessionId: string;
    courseId: string;
    expressionLatex: string;
    selectionPath: string | null;
    operatorIndex?: number;
    userRole: UserRole;
    userId?: string;
}

export type OrchestratorStepStatus =
    | "step-applied"
    | "no-candidates"
    | "engine-error";

export interface OrchestratorStepResult {
    history: StepHistory;
    engineResult: EngineStepExecutionResult | null;
    status: OrchestratorStepStatus;
    debugInfo?: {
        allCandidates: unknown[];
    } | null;
}

/**
 * Run a single step orchestration.
 */
export async function runOrchestratorStep(
    ctx: OrchestratorContext,
    req: OrchestratorStepRequest
): Promise<OrchestratorStepResult> {
    // 1. Load history from Session Service
    let history = await SessionService.getHistory(req.sessionId, req.userId, req.userRole);

    // 2. Build MapMasterInput
    // TzV2.1: Use courseId to select the specific invariant set.
    const targetSet = ctx.invariantRegistry.getInvariantSetById(req.courseId);

    if (!targetSet) {
        return {
            status: "engine-error",
            engineResult: { ok: false, errorCode: `course-not-found: ${req.courseId}` },
            history,
        };
    }

    const invariantSetIds = [targetSet.id];

    const mapInput: MapMasterInput = {
        expressionLatex: req.expressionLatex,
        selectionPath: req.selectionPath,
        operatorIndex: req.operatorIndex,
        invariantSetIds,
        registry: ctx.invariantRegistry,
    };

    // 3. Call MapMaster (Generates candidates)
    const mapResult = mapMasterGenerate(mapInput);

    // 4. Build Map (Phase 2)
    const ast = parseExpression(req.expressionLatex);
    if (!ast) {
        return {
            status: "engine-error",
            engineResult: { ok: false, errorCode: "parse-error" },
            history,
        };
    }
    const semanticMap = MapBuilder.build(req.expressionLatex, ast, mapResult.candidates);

    // 5. Build StepMasterInput
    let policy = ctx.policy;

    // RBAC Check: Only teachers can use teacher.debug
    if (policy.id === "teacher.debug" && req.userRole !== "teacher") {
        // Fallback to student policy
        policy = createDefaultStudentPolicy();
    }

    const stepInput: StepMasterMapInput = {
        candidates: mapResult.candidates,
        history: getSnapshot(history),
        policy: policy,
        selectionPath: req.selectionPath, // Pass selectionPath
        map: semanticMap
    };

    // 6. Call StepMaster (Map-based)
    const stepResult = stepMasterDecideFromMap(stepInput);

    // 7. Update History
    history = appendStepFromResult(history, stepResult, req.expressionLatex);

    // 8. Save History to Session Service
    await SessionService.updateHistory(req.sessionId, history);

    // 9. Handle Decision
    if (stepResult.decision.status === "no-candidates") {
        return {
            status: "no-candidates",
            engineResult: null,
            history,
            debugInfo: buildDebugInfo(policy, mapResult),
        };
    }

    if (stepResult.decision.status === "chosen") {
        const chosenId = stepResult.decision.chosenCandidateId;
        const chosenCandidate = mapResult.candidates.find(c => c.id === chosenId);

        if (!chosenCandidate) {
            // Should not happen if StepMaster behaves correctly
            return {
                status: "engine-error", // Internal error really
                engineResult: { ok: false, errorCode: "chosen-candidate-not-found" },
                history,
                debugInfo: buildDebugInfo(policy, mapResult),
            };
        }

        // 10. Execute via Engine
        const engineResult = await executeStepViaEngine(chosenCandidate, mapInput);

        if (engineResult.ok) {
            // Update history with expressionAfter
            if (engineResult.newExpressionLatex) {
                history = updateLastStep(history, { expressionAfter: engineResult.newExpressionLatex });
                await SessionService.updateHistory(req.sessionId, history);
            }

            return {
                status: "step-applied",
                engineResult,
                history,
                debugInfo: buildDebugInfo(policy, mapResult),
            };
        } else {
            // Update history with error code
            history = updateLastStep(history, { errorCode: engineResult.errorCode });
            await SessionService.updateHistory(req.sessionId, history);

            return {
                status: "engine-error",
                engineResult,
                history,
                debugInfo: buildDebugInfo(policy, mapResult),
            };
        }
    }

    // Fallback
    return {
        status: "no-candidates",
        engineResult: null,
        history,
    };
}

function buildDebugInfo(policy: StepPolicyConfig, mapResult: { candidates: unknown[] }) {
    // ALWAYS return candidates for debugging purposes (User Request)
    return {
        allCandidates: mapResult.candidates
    };
}

/**
 * Undo the last step for a session.
 * Returns the expression of the new last step (or null if history is empty).
 */
export async function undoLastStep(
    ctx: OrchestratorContext,
    sessionId: string
): Promise<string | null> {
    const history = await SessionService.getHistory(sessionId);

    if (history.entries.length === 0) {
        return null;
    }

    // Get the last step to know what we are undoing (optional logic could go here)
    const lastEntry = history.entries[history.entries.length - 1];
    const previousExpression = lastEntry.expressionBefore;

    // Remove the last step
    const newHistory = removeLastStep(history);

    // Save updated history
    await SessionService.updateHistory(sessionId, newHistory);

    return previousExpression;
}

/**
 * Generate a hint for the next step.
 */
export async function generateHint(
    ctx: OrchestratorContext,
    req: HintRequest
): Promise<HintResponse> {
    // 1. Load history (for context)
    const history = await SessionService.getHistory(req.sessionId);

    // 2. Build MapMasterInput
    const targetSet = ctx.invariantRegistry.getInvariantSetById(req.courseId);
    if (!targetSet) {
        return { status: "error", error: `course-not-found: ${req.courseId}` };
    }

    const mapInput: MapMasterInput = {
        expressionLatex: req.expressionLatex,
        selectionPath: req.selectionPath,
        invariantSetIds: [targetSet.id],
        registry: ctx.invariantRegistry,
    };

    // 3. Call MapMaster
    const mapResult = mapMasterGenerate(mapInput);

    // 4. Build Map (Phase 2)
    const ast = parseExpression(req.expressionLatex);
    if (!ast) {
        return { status: "error", error: "parse-error" };
    }
    const semanticMap = MapBuilder.build(req.expressionLatex, ast, mapResult.candidates);

    // 5. Build StepMasterInput
    const stepInput: StepMasterMapInput = {
        candidates: mapResult.candidates,
        history: getSnapshot(history),
        policy: ctx.policy,
        map: semanticMap,
        selectionPath: req.selectionPath
    };

    // 6. Call StepMaster (Map-based)
    const stepResult = stepMasterDecideFromMap(stepInput);

    // 7. Return Hint
    if (stepResult.decision.status === "chosen") {
        const chosenId = stepResult.decision.chosenCandidateId;
        const chosenCandidate = mapResult.candidates.find(c => c.id === chosenId);
        if (chosenCandidate) {
            return {
                status: "hint-found",
                hintText: chosenCandidate.description,
            };
        }
    }

    return { status: "no-hint" };
}
