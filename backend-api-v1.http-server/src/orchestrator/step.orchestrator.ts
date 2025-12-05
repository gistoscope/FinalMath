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
    createDefaultStudentPolicy,
    type StepPolicyConfig,
    type StepMasterInput,
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
import { isLocalToSelection } from "./locality";
import { StepSnapshotStore } from "../debug/StepSnapshotStore.js";

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
        allCandidates?: unknown[];
        [key: string]: unknown;
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

    // 3. Call MapMaster
    const mapResult = mapMasterGenerate(mapInput);
    console.log(`[Orchestrator] MapMaster found ${mapResult.candidates.length} candidates`);

    // 3b. Enforce Locality (Stage-1)
    // Filter out candidates that are not local to the selection.
    // Note: If selectionPath is missing, isLocalToSelection returns true (fallback).
    mapResult.candidates = mapResult.candidates.filter(c => {
        const isLocal = isLocalToSelection(req.selectionPath, mapResult.resolvedSelectionPath, c);
        return isLocal;
    });
    console.log(`[Orchestrator] After locality filter: ${mapResult.candidates.length} candidates`);

    // 3c. Operator Anchoring (Stage-1 Fix)
    // If the user clicked on a binary operator (+, -), we want to anchor the candidates to that operator.
    // This prevents sub-expression candidates (like INT_DIV_EXACT on a fraction) from being chosen.
    const { parseExpression, getNodeAt } = await import("../mapmaster/ast");
    const { getOperatorAnchorPath } = await import("./locality");
    const ast = parseExpression(req.expressionLatex);

    if (ast && mapResult.resolvedSelectionPath) {
        const anchorPath = getOperatorAnchorPath(ast, mapResult.resolvedSelectionPath, getNodeAt);
        if (anchorPath) {

            const anchoredCandidates = mapResult.candidates.filter(c => c.targetPath === anchorPath);
            if (anchoredCandidates.length > 0) {
                mapResult.candidates = anchoredCandidates;
            } else {
                // console.log(`[Orchestrator] No candidates found for anchor ${anchorPath}, falling back to locality.`);
            }
        }
    }

    // 3d. Stage-1 Strict Primitives (Atomic Mode)
    // We enforce a strict set of allowed primitives for Stage-1.
    const STAGE1_ATOMIC_MODE = true; // Config flag
    if (STAGE1_ATOMIC_MODE) {
        const ALLOWED_PRIMITIVES = new Set([
            "P.INT_ADD",
            "P.INT_SUB",
            "P.FRAC_ADD_SAME",
            // "P.ADD_ZERO", // Optional harmless ones
            // "P.REDUNDANT_BRACKETS"
        ]);

        mapResult.candidates = mapResult.candidates.filter(c => {
            const primId = c.primitiveIds[0];
            // Explicit exclusions
            if (primId === "P.INT_DIV_EXACT" || primId === "P.INT_PLUS_FRAC") return false;

            // Allow list
            if (ALLOWED_PRIMITIVES.has(primId)) return true;

            // Allow if it's not explicitly excluded? 
            // The prompt says "Filter candidates again to keep ONLY those with invariantRuleId in the Stage-1 whitelist."
            // But we might have other valid ones like P.PAREN_REMOVE.
            // Let's be strict for now as requested.
            return false;
        });
    }

    // 4. Build StepMasterInput
    let policy = ctx.policy;

    // RBAC Check: Only teachers can use teacher.debug
    if (policy.id === "teacher.debug" && req.userRole !== "teacher") {
        // Fallback to student policy
        policy = createDefaultStudentPolicy();
    }

    const stepInput: StepMasterInput = {
        candidates: mapResult.candidates,
        history: getSnapshot(history),
        policy: policy,
    };

    // 5. Call StepMaster
    const stepResult = stepMasterDecide(stepInput);
    console.log(`[Orchestrator] StepMaster chosen: ${stepResult.decision.status === "chosen" ? stepResult.decision.chosenCandidateId : "none"}`);

    // 6. Update History
    history = appendStepFromResult(history, stepResult, req.expressionLatex);

    // 7. Save History to Session Service
    await SessionService.updateHistory(req.sessionId, history);

    // 8. Handle Decision
    if (stepResult.decision.status === "no-candidates") {
        captureSnapshot(req, mapResult, "no-candidates");
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

        // STAGE 1 ENFORCEMENT: Primitive Validation
        // We strictly require that the applied step corresponds to a valid, known primitive.
        const primaryPrimitiveId = chosenCandidate.primitiveIds[0];
        const primitiveDef = ctx.invariantRegistry.getPrimitiveById(primaryPrimitiveId);
        console.log(`[Orchestrator] Validating primitive ${primaryPrimitiveId}: found=${!!primitiveDef}`);

        if (!primaryPrimitiveId || !primitiveDef) {
            // Invalid or unknown primitive. Reject the step.
            // We treat this as "no-candidates" (effectively no step applied) but with debug info.
            captureSnapshot(req, mapResult, "no-candidates", chosenCandidate, null, "invalid-primitive-id");
            return {
                status: "no-candidates",
                engineResult: null,
                history,
                debugInfo: {
                    ...buildDebugInfo(policy, mapResult),
                    reason: "invalid-primitive-id",
                    invalidId: primaryPrimitiveId
                }
            };
        }

        // 8. Execute via Engine
        const engineResult = await executeStepViaEngine(chosenCandidate, mapInput);

        if (engineResult.ok) {
            // Update history with expressionAfter
            if (engineResult.newExpressionLatex) {
                history = updateLastStep(history, { expressionAfter: engineResult.newExpressionLatex });
                await SessionService.updateHistory(req.sessionId, history);
            }

            captureSnapshot(req, mapResult, "step-applied", chosenCandidate, engineResult);
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

            captureSnapshot(req, mapResult, "engine-error", chosenCandidate, engineResult);
            return {
                status: "engine-error",
                engineResult,
                history,
                debugInfo: buildDebugInfo(policy, mapResult),
            };
        }
    }



    // Fallback
    captureSnapshot(req, mapResult, "no-candidates");
    return {
        status: "no-candidates",
        engineResult: null,
        history,
    };
}

function buildDebugInfo(policy: StepPolicyConfig, mapResult: { candidates: unknown[] }) {
    if (policy.id === "teacher.debug") {
        return {
            allCandidates: mapResult.candidates
        };
    }
    return null;
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
        operatorIndex: req.operatorIndex,
        invariantSetIds: [targetSet.id],
        registry: ctx.invariantRegistry,
    };

    // 3. Call MapMaster
    const mapResult = mapMasterGenerate(mapInput);

    // 4. Build StepMasterInput
    const stepInput: StepMasterInput = {
        candidates: mapResult.candidates,
        history: getSnapshot(history),
        policy: ctx.policy,
    };

    // 5. Call StepMaster
    const stepResult = stepMasterDecide(stepInput);

    // 6. Return Hint
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

function captureSnapshot(
    req: OrchestratorStepRequest,
    mapResult: { candidates: any[], resolvedSelectionPath?: string },
    status: string,
    chosenCandidate?: any,
    engineResult?: any,
    error?: string
) {
    StepSnapshotStore.setLatest({
        id: `step-${Date.now()}`,
        timestamp: new Date().toISOString(),
        inputLatex: req.expressionLatex,
        outputLatex: engineResult?.newExpressionLatex,
        selectionPath: req.selectionPath,
        selectionAstPath: mapResult.resolvedSelectionPath,
        engineResponseStatus: status,
        chosenCandidate,
        allCandidates: mapResult.candidates,
        error: error || (engineResult?.ok === false ? engineResult.errorCode : undefined)
    });
    // Also append to session history
    StepSnapshotStore.appendSnapshot(StepSnapshotStore.getLatest()!);
}
