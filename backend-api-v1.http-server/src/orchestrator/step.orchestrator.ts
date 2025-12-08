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
import { computePrimitiveDebug } from "../engine/primitives/PrimitiveDebug";
import type { PrimitiveDebugInfo } from "../protocol/backend-step.types";
import type { PrimitiveMaster } from "../primitive-master/PrimitiveMaster";
import { PRIMITIVE_DEFINITIONS, PrimitiveId } from "../engine/primitives.registry";

export interface OrchestratorContext {
    invariantRegistry: InMemoryInvariantRegistry;
    policy: StepPolicyConfig;
    primitiveMaster?: PrimitiveMaster;
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
    primitiveDebug?: PrimitiveDebugInfo;
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

    // 3. Candidate Generation
    let mapResult: { candidates: any[], resolvedSelectionPath?: string };
    let isPrimitiveMasterPath = false;
    let pmPrimitiveId: string | null = null;

    if (ctx.primitiveMaster) {
        console.log("[Orchestrator] Using PrimitiveMaster path");
        const pmResult = await ctx.primitiveMaster.match({
            expressionLatex: req.expressionLatex,
            selectionPath: req.selectionPath,
            operatorIndex: req.operatorIndex,
            invariantSetId: req.courseId,
            expressionId: undefined,
            context: { userRole: req.userRole }
        });

        if (pmResult.status === "match-found") {
            isPrimitiveMasterPath = true;
            pmPrimitiveId = pmResult.primitiveId;
            const candidate = {
                id: "pm-match",
                invariantRuleId: "primitive-master-rule",
                primitiveIds: [pmResult.primitiveId],
                targetPath: pmResult.window.centerPath,
                description: "PrimitiveMaster Selection",
            };
            mapResult = {
                candidates: [candidate],
                resolvedSelectionPath: pmResult.window.centerPath
            };
        } else if (pmResult.status === "no-match") {
            console.log(`[Orchestrator] PrimitiveMaster returned no-match: ${pmResult.reason}`);
            return {
                status: "no-candidates",
                engineResult: null,
                history,
            };
        } else {
            console.log(`[Orchestrator] PrimitiveMaster error: ${pmResult.message}`);
            return {
                status: "engine-error",
                engineResult: { ok: false, errorCode: pmResult.message },
                history,
            };
        }
    } else {
        // Legacy/Default MapMaster Path
        mapResult = mapMasterGenerate(mapInput);
        console.log(`[Orchestrator] MapMaster returned ${mapResult.candidates.length} candidates for expression "${req.expressionLatex}" using set "${targetSet.id}"`);
        if (mapResult.candidates.length === 0) {
            console.log(`[Orchestrator] Active rules in set: ${targetSet.rules.map(r => r.id).join(', ')}`);
        }
    }


    // 3b. Enforce Locality (Stage-1)
    // Filter out candidates that are not local to the selection.
    // Note: If selectionPath is missing, isLocalToSelection returns true (fallback).
    // 3b. Enforce Locality (Stage-1)
    // Filter out candidates that are not local to the selection.
    // Note: If selectionPath is missing, isLocalToSelection returns true (fallback).
    console.log(`[Orchestrator] Candidates before locality: ${mapResult.candidates.length}`);
    mapResult.candidates = mapResult.candidates.filter(c => {
        const isLocal = isLocalToSelection(req.selectionPath, mapResult.resolvedSelectionPath, c);
        if (!isLocal) console.log(`[Orchestrator] Filtered by locality: ${c.id}`);
        return isLocal;
    });
    console.log(`[Orchestrator] Candidates after locality: ${mapResult.candidates.length}`);


    // 3c. Operator Anchoring (Stage-1 Fix)
    // If the user clicked on a binary operator (+, -), we want to anchor the candidates to that operator.
    const { parseExpression, getNodeAt } = await import("../mapmaster/ast");

    const { getOperatorAnchorPath } = await import("./locality");
    // const { primitiveCatalog } = await import("../mapmaster/primitive-catalog");

    const ast = parseExpression(req.expressionLatex);

    let operatorAnchorPath: string | null = null;
    if (ast) {
        operatorAnchorPath = getOperatorAnchorPath(
            ast,
            mapResult.resolvedSelectionPath,
            req.selectionPath,
            req.operatorIndex,
            getNodeAt
        );

        if (operatorAnchorPath) {
            console.log(`[Orchestrator] Anchoring to path: ${operatorAnchorPath}`);
            const anchoredCandidates = mapResult.candidates.filter(c => c.targetPath === operatorAnchorPath);
            // If we have candidates for the anchor, strictly enforce it.
            if (anchoredCandidates.length > 0) {
                mapResult.candidates = anchoredCandidates;
            } else {
                // If explicit operator click but no candidates, we should probably return no-candidates
                // rather than applying something random.
                mapResult.candidates = [];
            }
        }
    }
    console.log(`[Orchestrator] Candidates after anchoring: ${mapResult.candidates.length}`);

    // 3d. Stage-1 Strict Primitives (Atomic Mode)
    // We enforce a strict set of allowed primitives.
    // V5 Update: We use the canonical registry. If MapMaster returned it, and it's in registry, it's valid.
    // The previous logic filtered by "stage1" property in catalog.
    // We will now trust MapMaster (which uses the catalog) + Registry validation later.
    /*
    const STAGE1_ATOMIC_MODE = true; // Config flag
    if (STAGE1_ATOMIC_MODE) {
       // ... removed logic ...
    }
    */
    console.log(`[Orchestrator] Candidates: ${mapResult.candidates.length}`);

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
        // Pass the strict action target (operator anchor if available, else selection path)
        actionTarget: operatorAnchorPath || mapResult.resolvedSelectionPath
    };

    // 5. Call StepMaster
    const stepResult = stepMasterDecide(stepInput);

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
        // Use primitives from StepMaster decision if available, otherwise fallback to candidate.
        // Update for V5: Validate against PRIMITIVE_DEFINITIONS registry.
        const primitivesToApply = stepResult.primitivesToApply?.map(p => p.id) || chosenCandidate.primitiveIds;
        const primaryPrimitiveId = primitivesToApply[0] as PrimitiveId;
        const primitiveDef = PRIMITIVE_DEFINITIONS[primaryPrimitiveId];

        if (!primaryPrimitiveId || !primitiveDef) {
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

            // Compute Primitive Debug Info
            let primitiveDebug: PrimitiveDebugInfo | undefined;
            if (isPrimitiveMasterPath && pmPrimitiveId) {
                primitiveDebug = {
                    primitiveId: pmPrimitiveId,
                    status: "ready",
                    domain: "primitive-master",
                    reason: "matched-by-selection"
                };
            } else if (req.operatorIndex != null && ast) {
                primitiveDebug = computePrimitiveDebug({
                    expressionLatex: req.expressionLatex,
                    stage: 1, // Default to Stage 1 for now
                    astRoot: ast,
                    operatorIndex: req.operatorIndex
                });
            }

            return {
                status: "step-applied",
                engineResult,
                history,
                debugInfo: buildDebugInfo(policy, mapResult),
                primitiveDebug
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
