/**
 * Step Orchestrator (TzV1.1)
 *
 * Responsibilities:
 *  - Act as the central coordinator for a single step.
 *  - Talk to Invariants Registry, MapMaster, StepMaster, History, Engine Bridge.
 *  - Maintain per-request step history and policy.
 */
import { mapMasterGenerate, } from "../mapmaster/index";
import { stepMasterDecide, createDefaultStudentPolicy, } from "../stepmaster/index";
import { appendStepFromResult, getSnapshot, removeLastStep, updateLastStep, } from "../stepmaster/index";
import { executeStepViaEngine, } from "../engine/index";
import { SessionService } from "../session/session.service";
import { isLocalToSelection } from "./locality";
import { StepSnapshotStore } from "../debug/StepSnapshotStore.js";
/**
 * Run a single step orchestration.
 */
export async function runOrchestratorStep(ctx, req) {
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
    const mapInput = {
        expressionLatex: req.expressionLatex,
        selectionPath: req.selectionPath,
        operatorIndex: req.operatorIndex,
        invariantSetIds,
        registry: ctx.invariantRegistry,
    };
    // 3. Call MapMaster
    const mapResult = mapMasterGenerate(mapInput);
    // 3b. Enforce Locality (Stage-1)
    // Filter out candidates that are not local to the selection.
    // Note: If selectionPath is missing, isLocalToSelection returns true (fallback).
    mapResult.candidates = mapResult.candidates.filter(c => {
        const isLocal = isLocalToSelection(req.selectionPath, mapResult.resolvedSelectionPath, c);
        return isLocal;
    });
    // 3c. Operator Anchoring (Stage-1 Fix)
    // If the user clicked on a binary operator (+, -), we want to anchor the candidates to that operator.
    const { parseExpression, getNodeAt } = await import("../mapmaster/ast");
    const { getOperatorAnchorPath } = await import("./locality");
    const { primitiveCatalog } = await import("../mapmaster/primitive-catalog");
    const ast = parseExpression(req.expressionLatex);
    let operatorAnchorPath = null;
    if (ast) {
        operatorAnchorPath = getOperatorAnchorPath(ast, mapResult.resolvedSelectionPath, req.selectionPath, req.operatorIndex, getNodeAt);
        if (operatorAnchorPath) {
            const anchoredCandidates = mapResult.candidates.filter(c => c.targetPath === operatorAnchorPath);
            // If we have candidates for the anchor, strictly enforce it.
            if (anchoredCandidates.length > 0) {
                mapResult.candidates = anchoredCandidates;
            }
            else {
                // If explicit operator click but no candidates, we should probably return no-candidates
                // rather than applying something random.
                mapResult.candidates = [];
            }
        }
    }
    // 3d. Stage-1 Strict Primitives (Atomic Mode)
    // We enforce a strict set of allowed primitives for Stage-1 based on Operation Classes.
    const STAGE1_ATOMIC_MODE = true; // Config flag
    if (STAGE1_ATOMIC_MODE) {
        mapResult.candidates = mapResult.candidates.filter(c => {
            const primId = c.primitiveIds[0];
            // Find metadata in catalog
            const catalogEntry = primitiveCatalog.find(p => p.primitiveId === primId);
            if (!catalogEntry) {
                return false;
            }
            if (catalogEntry.stage !== "stage1")
                return false;
            // Optional: Check Operation Type Symmetry if we knew the clicked operator type.
            // But strict stage1 check + anchoring should be enough for now.
            return true;
        });
    }
    // 4. Build StepMasterInput
    let policy = ctx.policy;
    // RBAC Check: Only teachers can use teacher.debug
    if (policy.id === "teacher.debug" && req.userRole !== "teacher") {
        // Fallback to student policy
        policy = createDefaultStudentPolicy();
    }
    const stepInput = {
        candidates: mapResult.candidates,
        history: getSnapshot(history),
        policy: policy,
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
        const primaryPrimitiveId = chosenCandidate.primitiveIds[0];
        const primitiveDef = ctx.invariantRegistry.getPrimitiveById(primaryPrimitiveId);
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
        }
        else {
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
function buildDebugInfo(policy, mapResult) {
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
export async function undoLastStep(ctx, sessionId) {
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
export async function generateHint(ctx, req) {
    // 1. Load history (for context)
    const history = await SessionService.getHistory(req.sessionId);
    // 2. Build MapMasterInput
    const targetSet = ctx.invariantRegistry.getInvariantSetById(req.courseId);
    if (!targetSet) {
        return { status: "error", error: `course-not-found: ${req.courseId}` };
    }
    const mapInput = {
        expressionLatex: req.expressionLatex,
        selectionPath: req.selectionPath,
        operatorIndex: req.operatorIndex,
        invariantSetIds: [targetSet.id],
        registry: ctx.invariantRegistry,
    };
    // 3. Call MapMaster
    const mapResult = mapMasterGenerate(mapInput);
    // 4. Build StepMasterInput
    const stepInput = {
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
function captureSnapshot(req, mapResult, status, chosenCandidate, engineResult, error) {
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
    StepSnapshotStore.appendSnapshot(StepSnapshotStore.getLatest());
}
