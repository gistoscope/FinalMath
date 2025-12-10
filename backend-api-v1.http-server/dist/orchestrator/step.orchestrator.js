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
import { computePrimitiveDebug } from "../engine/primitives/PrimitiveDebug";
import { PRIMITIVE_DEFINITIONS } from "../engine/primitives.registry";
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
    // 3. V5 Decision Core Integration
    // If PrimitiveMaster is available, we delegate the entire "match & select" process to it.
    let mapResult;
    let isPrimitiveMasterPath = false;
    let pmPrimitiveId = null;
    let v5Outcome = null;
    let operatorAnchorPath = null;
    // We need AST for V5 logic (and legacy anchoring)
    // We need AST for V5 logic (and legacy anchoring)
    const { parseExpression, getNodeAt } = await import("../mapmaster/ast");
    const ast = parseExpression(req.expressionLatex);
    // [New] Surface AST Logic for V5
    // Helper to augment AST with IDs if they are missing (since parser returns raw AST)
    function augmentAstWithIds(root) {
        if (!root)
            return;
        const traverse = (node, path) => {
            if (!node)
                return;
            node.id = path; // Assign ID
            if (node.type === "binaryOp") {
                traverse(node.left, path === "root" ? "term[0]" : `${path}.term[0]`);
                traverse(node.right, path === "root" ? "term[1]" : `${path}.term[1]`);
            }
            else if (node.type === "fraction") {
                // Fraction children (numerator/denominator) are strict strings in current AstNode def,
                // so we don't traverse them as nodes unless we change the parser/types.
                // If they were nodes, we'd do: traverse(node.numerator, ...);
            }
        };
        traverse(root, "root");
        return root;
    }
    if (ctx.primitiveMaster && ast) {
        console.log("[Orchestrator] Using V5 PrimitiveMaster Path");
        // 1. Augment AST with IDs (Surface Map)
        augmentAstWithIds(ast);
        console.log(`[V5-ORCH] rootAst.id=${ast.id}, kind=${ast.type}`);
        // Resolve Click Target
        const clickTarget = await ctx.primitiveMaster.resolveClickTarget(ast, req.selectionPath || "", req.operatorIndex);
        if (clickTarget) {
            // Resolve Primitive (Match -> Select)
            v5Outcome = await ctx.primitiveMaster.resolvePrimitive({
                expressionId: "expr-temp",
                expressionLatex: req.expressionLatex,
                click: clickTarget,
                ast: ast // Pass the augmented AST
            });
            // Handle V5 Outcome
            if (v5Outcome.kind === "green-primitive" || v5Outcome.kind === "yellow-scenario") {
                // GREEN / YELLOW -> Execute immediately (Auto-Apply)
                // We treat "yellow-scenario" as auto-apply for now until Scenario Manager is fully active.
                if (v5Outcome.primitive) {
                    isPrimitiveMasterPath = true;
                    pmPrimitiveId = v5Outcome.primitive.enginePrimitiveId; // Use the ENGINE ID
                    // Create a synthetic candidate for the legacy runner
                    // The runner still expects a "candidate" object for now.
                    const candidate = {
                        id: "v5-match",
                        invariantRuleId: "v5-rule",
                        primitiveIds: [pmPrimitiveId],
                        targetPath: clickTarget.nodeId,
                        description: v5Outcome.primitive.label,
                    };
                    mapResult = {
                        candidates: [candidate],
                        resolvedSelectionPath: clickTarget.nodeId
                    };
                }
                else {
                    mapResult = { candidates: [] };
                }
            }
            else if (v5Outcome.kind === "blue-choice") {
                // BLUE -> Ask User (Context Menu)
                console.log("[Orchestrator] V5 Blue Choice Detected");
                return {
                    status: "step-applied",
                    engineResult: null,
                    history,
                    debugInfo: {
                        v5Status: "ask-user",
                        options: v5Outcome.matches
                    }
                };
            }
            else if (v5Outcome.kind === "red-diagnostic") {
                // RED -> Diagnostic Message
                console.log("[Orchestrator] V5 Red Diagnostic Detected");
                return {
                    status: "no-candidates",
                    engineResult: null,
                    history,
                    debugInfo: {
                        v5Status: "diagnostic",
                        message: v5Outcome.primitive?.label
                    }
                };
            }
            else {
                mapResult = { candidates: [] };
            }
        }
        else {
            console.log("[Orchestrator] Click target could not be resolved in V5.");
            mapResult = { candidates: [] };
        }
    }
    // FALLBACK to Legacy if V5 produced no candidates (or if PM not present)
    if ((!mapResult || mapResult.candidates.length === 0) && !v5Outcome) {
        if (!ctx.primitiveMaster) {
            // Legacy/Default MapMaster Path
            mapResult = mapMasterGenerate(mapInput);
            console.log(`[Orchestrator] MapMaster returned ${mapResult.candidates.length} candidates for expression "${req.expressionLatex}" using set "${targetSet.id}"`);
            // 3b. Enforce Locality (Stage-1)
            mapResult.candidates = mapResult.candidates.filter(c => {
                const isLocal = isLocalToSelection(req.selectionPath, mapResult.resolvedSelectionPath, c);
                // if (!isLocal) console.log(`[Orchestrator] Filtered by locality: ${c.id}`);
                return isLocal;
            });
            // 3c. Operator Anchoring (Stage-1 Fix)
            const { getOperatorAnchorPath } = await import("./locality");
            // ast is already parsed above
            if (ast) {
                operatorAnchorPath = getOperatorAnchorPath(ast, mapResult.resolvedSelectionPath, req.selectionPath, req.operatorIndex, getNodeAt);
                if (operatorAnchorPath) {
                    const anchoredCandidates = mapResult.candidates.filter(c => c.targetPath === operatorAnchorPath);
                    if (anchoredCandidates.length > 0) {
                        mapResult.candidates = anchoredCandidates;
                    }
                    else {
                        mapResult.candidates = [];
                    }
                }
            }
        }
        else {
            // V5 was arguably authoritative if it ran.
            if (!mapResult)
                mapResult = { candidates: [] };
        }
    }
    // Safety check
    if (!mapResult)
        mapResult = { candidates: [] };
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
            return {
                status: "engine-error",
                engineResult: { ok: false, errorCode: "chosen-candidate-not-found" },
                history,
                debugInfo: buildDebugInfo(policy, mapResult),
            };
        }
        // STAGE 1 ENFORCEMENT
        const primitivesToApply = stepResult.primitivesToApply?.map(p => p.id) || chosenCandidate.primitiveIds;
        const primaryPrimitiveId = primitivesToApply[0];
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
        // === V5 LOGGING START ===
        if (pmPrimitiveId) {
            console.log(`[Orchestrator] [V5-RUNNER-START] Executing Primitive: ${pmPrimitiveId}`);
        }
        // === V5 LOGGING END ===
        const engineResult = await executeStepViaEngine(chosenCandidate, mapInput);
        if (engineResult.ok) {
            if (engineResult.newExpressionLatex) {
                history = updateLastStep(history, { expressionAfter: engineResult.newExpressionLatex });
                await SessionService.updateHistory(req.sessionId, history);
            }
            captureSnapshot(req, mapResult, "step-applied", chosenCandidate, engineResult);
            // Primitive Debug
            let primitiveDebug;
            if (isPrimitiveMasterPath && pmPrimitiveId) {
                primitiveDebug = {
                    primitiveId: pmPrimitiveId,
                    status: "ready",
                    domain: "primitive-master",
                    reason: "matched-by-selection"
                };
            }
            else if (req.operatorIndex != null && ast) {
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
        }
        else {
            // === V5 LOGGING START ===
            console.error("[Orchestrator] [V5-RUNNER-FAIL] Error details:", JSON.stringify(engineResult, null, 2));
            // === V5 LOGGING END ===
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
export async function undoLastStep(ctx, sessionId) {
    const history = await SessionService.getHistory(sessionId);
    if (history.entries.length === 0) {
        return null;
    }
    const lastEntry = history.entries[history.entries.length - 1];
    const previousExpression = lastEntry.expressionBefore;
    const newHistory = removeLastStep(history);
    await SessionService.updateHistory(sessionId, newHistory);
    return previousExpression;
}
export async function generateHint(ctx, req) {
    const history = await SessionService.getHistory(req.sessionId);
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
    const mapResult = mapMasterGenerate(mapInput);
    const stepInput = {
        candidates: mapResult.candidates,
        history: getSnapshot(history),
        policy: ctx.policy,
    };
    const stepResult = stepMasterDecide(stepInput);
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
    StepSnapshotStore.appendSnapshot(StepSnapshotStore.getLatest());
}
