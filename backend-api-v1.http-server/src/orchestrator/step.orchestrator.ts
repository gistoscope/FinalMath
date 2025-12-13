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
import { TraceHub, shortLatex, generateTraceId } from "../debug/TraceHub.js";

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
    preferredPrimitiveId?: string; // NEW: Client's choice from a previous "choice" response
    surfaceNodeKind?: string; // NEW: Surface node kind from viewer (e.g., "Num", "BinaryOp")
    traceId?: string; // NEW: TraceHub correlation ID from viewer
}

export type OrchestratorStepStatus =
    | "step-applied"
    | "no-candidates"
    | "engine-error"
    | "choice"; // NEW: Multiple actions available for this click

import type { StepChoice } from "../protocol/backend-step.types";

export interface OrchestratorStepResult {
    history: StepHistory;
    engineResult: EngineStepExecutionResult | null;
    status: OrchestratorStepStatus;
    debugInfo?: {
        allCandidates?: unknown[];
        [key: string]: unknown;
    } | null;
    primitiveDebug?: PrimitiveDebugInfo;
    choices?: StepChoice[]; // NEW: Available when status is "choice"
}

/**
 * Run a single step orchestration.
 */
export async function runOrchestratorStep(
    ctx: OrchestratorContext,
    req: OrchestratorStepRequest
): Promise<OrchestratorStepResult> {
    // TraceHub: Setup context and emit ORCHESTRATOR_ENTER
    const traceId = req.traceId || generateTraceId();
    const stepId = `step-${Date.now()}`;
    TraceHub.setContext(traceId, stepId);

    TraceHub.emit({
        module: "backend.orchestrator",
        event: "ORCHESTRATOR_ENTER",
        data: {
            expressionLatex: shortLatex(req.expressionLatex),
            selectionPath: req.selectionPath,
            preferredPrimitiveId: req.preferredPrimitiveId,
            surfaceNodeKind: req.surfaceNodeKind,
            courseId: req.courseId,
        }
    });

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

    // 3. V5 Decision Core Integration
    // If PrimitiveMaster is available, we delegate the entire "match & select" process to it.
    let mapResult: { candidates: any[], resolvedSelectionPath?: string } | undefined;
    let isPrimitiveMasterPath = false;
    let pmPrimitiveId: string | null = null;
    let v5Outcome: any = null;
    let operatorAnchorPath: string | null = null;

    // We need AST for V5 logic (and legacy anchoring)
    // We need AST for V5 logic (and legacy anchoring)
    const { parseExpression, getNodeAt } = await import("../mapmaster/ast");
    const ast = parseExpression(req.expressionLatex);

    // [New] Surface AST Logic for V5
    // Helper to augment AST with IDs if they are missing (since parser returns raw AST)
    function augmentAstWithIds(root: any) {
        if (!root) return;

        const traverse = (node: any, path: string) => {
            if (!node || typeof node !== 'object') return;

            // Assign ID to this node
            node.id = path;

            // Handle different node types
            switch (node.type) {
                case "binaryOp":
                    // For binary operations, traverse left and right children
                    if (node.left) {
                        traverse(node.left, path === "root" ? "term[0]" : `${path}.term[0]`);
                    }
                    if (node.right) {
                        traverse(node.right, path === "root" ? "term[1]" : `${path}.term[1]`);
                    }
                    break;

                case "fraction":
                    // Fractions have numerator/denominator as strings in current AST,
                    // so no child traversal needed
                    break;

                case "mixed":
                    // Mixed numbers have whole, numerator, denominator as strings
                    break;

                case "integer":
                case "variable":
                    // Leaf nodes, no children to traverse
                    break;

                default:
                    // For any other node types, try to traverse common child properties
                    if (node.left) traverse(node.left, `${path}.left`);
                    if (node.right) traverse(node.right, `${path}.right`);
                    if (node.children && Array.isArray(node.children)) {
                        node.children.forEach((child: any, i: number) => {
                            traverse(child, `${path}.child[${i}]`);
                        });
                    }
                    break;
            }
        };

        traverse(root, "root");
        return root;
    }

    // Helper to find the first integer node path in the AST
    function findFirstIntegerPath(ast: any): string | null {
        if (!ast) return null;

        // DFS to find first integer
        const stack: Array<{ node: any; path: string }> = [{ node: ast, path: "root" }];

        while (stack.length > 0) {
            const { node, path } = stack.pop()!;
            if (!node) continue;

            if (node.type === "integer") {
                return path;
            }

            // Add children to stack
            if (node.right) stack.push({ node: node.right, path: `${path}.right` });
            if (node.left) stack.push({ node: node.left, path: `${path}.left` });

            if (node.children && Array.isArray(node.children)) {
                node.children.forEach((child: any, i: number) => {
                    stack.push({ node: child, path: `${path}.child[${i}]` });
                });
            }
        }

        return null;
    }

    // NEW: Integer Click Detection - return choice response for integers (unless preferredPrimitiveId is provided)
    if (ast && !req.preferredPrimitiveId) {
        // Augment AST with IDs first
        augmentAstWithIds(ast);

        // Check if the clicked node is an integer
        const clickedNodePath = req.selectionPath || "root";
        const clickedNode = getNodeAt(ast, clickedNodePath);

        // Detect integer click either by AST node type OR by surfaceNodeKind
        const isIntegerByAst = clickedNode && clickedNode.type === "integer";
        const isIntegerBySurface = req.surfaceNodeKind === "Num" || req.surfaceNodeKind === "Number" || req.surfaceNodeKind === "Integer";

        if (isIntegerByAst || isIntegerBySurface) {
            console.log(`[Orchestrator] Integer click detected: byAst=${isIntegerByAst}, bySurface=${isIntegerBySurface}, path=${clickedNodePath}, surfaceKind=${req.surfaceNodeKind}`);

            // Determine the target node ID for the choice
            // If we found an integer in AST, use its path; otherwise we need to find one
            let targetPath = clickedNodePath;
            let intValue: any = null;

            if (isIntegerByAst && clickedNode) {
                intValue = (clickedNode as any).value;
            } else if (isIntegerBySurface && ast) {
                // Surface says it's a number but AST path doesn't resolve to integer
                // This happens when selectionPath is null/root - try to find first integer in AST
                const firstIntPath = findFirstIntegerPath(ast);
                if (firstIntPath) {
                    targetPath = firstIntPath;
                    const intNode = getNodeAt(ast, firstIntPath);
                    intValue = intNode ? (intNode as any).value : null;
                }
            }

            // Return choice response with available integer actions
            return {
                status: "choice",
                engineResult: null,
                history,
                choices: [
                    {
                        id: "int-to-frac",
                        label: "Convert to fraction",
                        primitiveId: "P.INT_TO_FRAC",
                        targetNodeId: targetPath,
                    }
                ],
                debugInfo: {
                    clickedNodeType: "integer",
                    clickedNodePath,
                    targetNodeId: targetPath,
                    integerValue: intValue,
                    detectedByAst: isIntegerByAst,
                    detectedBySurface: isIntegerBySurface,
                }
            };
        }
    }

    if (ctx.primitiveMaster && ast) {
        console.log("[Orchestrator] Using V5 PrimitiveMaster Path");

        // 1. Augment AST with IDs (Surface Map)
        augmentAstWithIds(ast);
        console.log(`[V5-ORCH] rootAst.id=${(ast as any).id}, kind=${ast.type}`);

        // Resolve Click Target
        const clickTarget = await ctx.primitiveMaster.resolveClickTarget(ast, req.selectionPath || "", req.operatorIndex);

        if (clickTarget) {
            // Resolve Primitive (Match -> Select)
            v5Outcome = await ctx.primitiveMaster.resolvePrimitive({
                expressionId: "expr-temp",
                expressionLatex: req.expressionLatex,
                click: clickTarget,
                preferredPrimitiveId: req.preferredPrimitiveId,
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
                        targetPath: v5Outcome.matches[0]?.ctx?.actionNodeId ?? v5Outcome.matches[0]?.ctx?.clickTarget?.nodeId ?? clickTarget.nodeId,
                        description: v5Outcome.primitive.label,
                    };

                    mapResult = {
                        candidates: [candidate],
                        resolvedSelectionPath: candidate.targetPath
                    };
                } else {
                    mapResult = { candidates: [] };
                }
            } else if (v5Outcome.kind === "blue-choice") {
                // BLUE -> Ask User (Context Menu)
                // HOWEVER, if preferredPrimitiveId is provided, we should honor it and apply that primitive
                console.log(`[Orchestrator] V5 Blue Choice entry - preferredPrimitiveId="${req.preferredPrimitiveId || "NONE"}", matchCount=${v5Outcome.matches?.length || 0}`);
                if (req.preferredPrimitiveId && v5Outcome.matches && v5Outcome.matches.length > 0) {
                    // Find the match that corresponds to the preferred primitive
                    const preferredMatch = v5Outcome.matches.find(
                        (m: any) => m.row.id === req.preferredPrimitiveId || m.row.enginePrimitiveId === req.preferredPrimitiveId
                    );

                    if (preferredMatch) {
                        console.log(`[Orchestrator] V5 Blue Choice with preferredPrimitiveId="${req.preferredPrimitiveId}" - applying directly`);
                        isPrimitiveMasterPath = true;
                        pmPrimitiveId = preferredMatch.row.enginePrimitiveId || preferredMatch.row.id;

                        // Create candidate for the runner
                        const candidate = {
                            id: "v5-preferred-match",
                            invariantRuleId: "v5-rule",
                            primitiveIds: [pmPrimitiveId],
                            targetPath: preferredMatch.ctx?.actionNodeId ?? preferredMatch.ctx?.clickTarget?.nodeId ?? clickTarget.nodeId,
                            description: preferredMatch.row.label || "Apply primitive",
                        };

                        mapResult = {
                            candidates: [candidate],
                            resolvedSelectionPath: candidate.targetPath
                        };
                    } else {
                        // Preferred primitive not found in matches - return no-candidates
                        console.log(`[Orchestrator] V5 Blue Choice: preferredPrimitiveId="${req.preferredPrimitiveId}" not found in matches`);
                        return {
                            status: "no-candidates",
                            engineResult: { ok: false, errorCode: "preferred-primitive-not-in-candidates" },
                            history,
                            debugInfo: {
                                v5Status: "preferred-not-found",
                                preferredPrimitiveId: req.preferredPrimitiveId,
                                availableMatches: v5Outcome.matches.map((m: any) => m.row.id)
                            }
                        };
                    }
                } else {
                    // No preferredPrimitiveId - return choice to user
                    console.log("[Orchestrator] V5 Blue Choice Detected - asking user");
                    return {
                        status: "choice",
                        engineResult: null,
                        history,
                        choices: v5Outcome.matches.map((m: any) => ({
                            id: m.row.id,
                            label: m.row.label || m.row.id,
                            primitiveId: m.row.enginePrimitiveId || m.row.id,
                            targetNodeId: m.ctx?.clickTarget?.nodeId
                        })),
                        debugInfo: {
                            v5Status: "ask-user",
                            options: v5Outcome.matches
                        }
                    };
                }
            } else if (v5Outcome.kind === "red-diagnostic") {
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
            } else {
                mapResult = { candidates: [] };
            }
        } else {
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
                operatorAnchorPath = getOperatorAnchorPath(
                    ast,
                    mapResult.resolvedSelectionPath,
                    req.selectionPath,
                    req.operatorIndex,
                    getNodeAt
                );

                if (operatorAnchorPath) {
                    const anchoredCandidates = mapResult.candidates.filter(c => c.targetPath === operatorAnchorPath);
                    if (anchoredCandidates.length > 0) {
                        mapResult.candidates = anchoredCandidates;
                    } else {
                        mapResult.candidates = [];
                    }
                }
            }
        } else {
            // V5 was arguably authoritative if it ran.
            if (!mapResult) mapResult = { candidates: [] };
        }
    }

    // Safety check
    if (!mapResult) mapResult = { candidates: [] };



    // NEW: If the caller provided a preferredPrimitiveId (e.g. Hint Apply),
    // we MUST only consider candidates whose PRIMARY primitive matches it.
    // Otherwise, the orchestrator may apply a different "best" step (e.g. evaluate 2+3 -> 5),
    // which breaks the intended explicit action.
    if (req.preferredPrimitiveId && mapResult && Array.isArray(mapResult.candidates)) {
        const pref = req.preferredPrimitiveId;
        const before = mapResult.candidates.length;
        mapResult.candidates = mapResult.candidates.filter(c => {
            const prims = (c as any).primitiveIds;
            return Array.isArray(prims) && prims.length > 0 && prims[0] === pref;
        });
        const after = mapResult.candidates.length;
        console.log(`[Orchestrator] preferredPrimitiveId="${pref}" filtered candidates: ${before} -> ${after}`);
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

function buildDebugInfo(policy: StepPolicyConfig, mapResult: { candidates: unknown[] }) {
    if (policy.id === "teacher.debug") {
        return {
            allCandidates: mapResult.candidates
        };
    }
    return null;
}

export async function undoLastStep(
    ctx: OrchestratorContext,
    sessionId: string
): Promise<string | null> {
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

export async function generateHint(
    ctx: OrchestratorContext,
    req: HintRequest
): Promise<HintResponse> {
    const history = await SessionService.getHistory(req.sessionId);
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

    const mapResult = mapMasterGenerate(mapInput);

    const stepInput: StepMasterInput = {
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
        engineRequest: {
            selectionPath: req.selectionPath,
            preferredPrimitiveId: req.preferredPrimitiveId,
            operatorIndex: req.operatorIndex,
            surfaceNodeKind: (req as any).surfaceNodeKind,
            expressionLatex: req.expressionLatex,
        },
        engineResponseStatus: status,
        chosenCandidate,
        allCandidates: mapResult.candidates,
        error: error || (engineResult?.ok === false ? engineResult.errorCode : undefined)
    });
    StepSnapshotStore.appendSnapshot(StepSnapshotStore.getLatest()!);
}
