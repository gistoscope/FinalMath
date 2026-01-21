/**
 * StepOrchestrator Class
 *
 * Central coordinator for a single step execution.
 *
 * Responsibilities:
 *  - Talk to Invariants Registry, MapMaster, StepMaster, History, Engine Bridge
 *  - Maintain per-request step history and policy
 *  - Coordinate the full step execution pipeline
 */

import { container, injectable } from "tsyringe";
import { SessionService } from "../../modules/index.js";
import { AstParser } from "../ast/AstParser.js";
import { AstUtils } from "../ast/AstUtils.js";
import { EngineRunner } from "../engine/EngineRunner.js";
import { MapMaster } from "../mapmaster/MapMaster.js";
import type { SelectedOutcome } from "../primitive-master/primitive-master.types.js";
import { StepHistoryService } from "../stepmaster/StepHistory.js";
import { StepMaster } from "../stepmaster/StepMaster.js";
import type { StepHistory } from "../stepmaster/stepmaster.types.js";
import { getOperatorAnchorPath, isLocalToSelection } from "./locality.js";
import type {
  OrchestratorContext,
  OrchestratorStepRequest,
  OrchestratorStepResult,
} from "./orchestrator.types.js";

/**
 * StepOrchestrator - Coordinates step execution
 */
@injectable()
export class StepOrchestrator {
  private readonly log: (message: string) => void = console.log;
  private stepReq: OrchestratorStepRequest | null = null;

  constructor(
    private readonly sessionService: SessionService,
    private readonly stepMaster: StepMaster,
    private readonly mapMaster: MapMaster,
    private readonly engineRunner: EngineRunner,
    private readonly stepHistoryService: StepHistoryService,
    private readonly astUtils: AstUtils,
    private readonly astParser: AstParser
  ) {}

  async updateHistory(history: StepHistory) {
    return this.sessionService.updateHistory(this.stepReq?.sessionId || "", history);
  }

  async getHistory() {
    return this.sessionService.getHistory(
      this.stepReq?.sessionId || "",
      this.stepReq?.userId || "",
      this.stepReq?.userRole || "student"
    );
  }

  /**
   * Find the first integer node path in the AST using DFS.
   * Used as fallback when selectionPath doesn't resolve to an integer.
   */
  private findFirstIntegerPath(ast: any): string | null {
    if (!ast) return null;

    // DFS to find first integer (left-to-right order)
    const stack: Array<{ node: any; path: string }> = [{ node: ast, path: "root" }];

    while (stack.length > 0) {
      const { node, path } = stack.pop()!;
      if (!node) continue;

      if (node.type === "integer") {
        return path;
      }

      // For binaryOp, add children using term[0]/term[1] format
      // Push right first so left is processed first (left-to-right traversal)
      if (node.type === "binaryOp") {
        if (node.right) {
          const rightPath = path === "root" ? "term[1]" : `${path}.term[1]`;
          stack.push({ node: node.right, path: rightPath });
        }
        if (node.left) {
          const leftPath = path === "root" ? "term[0]" : `${path}.term[0]`;
          stack.push({ node: node.left, path: leftPath });
        }
      }
    }

    return null;
  }

  /**
   * Augment AST with IDs for V5 Surface Map integration.
   * Assigns path-based IDs to each node in the AST.
   */
  private augmentAstWithIds(root: any): any {
    if (!root) return root;

    const traverse = (node: any, path: string) => {
      if (!node || typeof node !== "object") return;

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

  /**
   * Handle V5 PrimitiveMaster outcome.
   * Returns mapResult with candidates based on V5 decision.
   */
  private async handleV5Outcome(
    v5Outcome: SelectedOutcome,
    req: OrchestratorStepRequest,
    clickTarget: any,
    history: StepHistory
  ): Promise<{
    mapResult?: { candidates: any[]; resolvedSelectionPath?: string };
    earlyReturn?: OrchestratorStepResult;
    isPrimitiveMasterPath: boolean;
    pmPrimitiveId: string | null;
  }> {
    let mapResult: { candidates: any[]; resolvedSelectionPath?: string } | undefined;
    let isPrimitiveMasterPath = false;
    let pmPrimitiveId: string | null = null;

    // Handle V5 Outcome
    if (v5Outcome.kind === "green-primitive" || v5Outcome.kind === "yellow-scenario") {
      // GREEN / YELLOW -> Execute immediately (Auto-Apply)
      if (v5Outcome.primitive) {
        isPrimitiveMasterPath = true;
        pmPrimitiveId = v5Outcome.primitive.enginePrimitiveId;

        // Create a synthetic candidate for the legacy runner
        const candidate = {
          id: "v5-match",
          invariantRuleId: "v5-rule",
          primitiveIds: [pmPrimitiveId],
          targetPath:
            v5Outcome.matches?.[0]?.ctx?.actionNodeId ??
            v5Outcome.matches?.[0]?.ctx?.clickTarget?.nodeId ??
            clickTarget.nodeId,
          description: v5Outcome.primitive.label,
        };

        mapResult = {
          candidates: [candidate],
          resolvedSelectionPath: candidate.targetPath,
        };
      } else {
        mapResult = { candidates: [] };
      }
    } else if (v5Outcome.kind === "blue-choice") {
      // BLUE -> Ask User (Context Menu)
      if (req.preferredPrimitiveId && v5Outcome.matches && v5Outcome.matches.length > 0) {
        // Find the match that corresponds to the preferred primitive
        const preferredMatch = v5Outcome.matches.find(
          (m: any) =>
            m.row.id === req.preferredPrimitiveId ||
            m.row.enginePrimitiveId === req.preferredPrimitiveId
        );

        if (preferredMatch) {
          this.log(
            `[Orchestrator] V5 Blue Choice with preferredPrimitiveId="${req.preferredPrimitiveId}" - applying directly`
          );
          isPrimitiveMasterPath = true;
          pmPrimitiveId = preferredMatch.row.enginePrimitiveId || preferredMatch.row.id;

          // Create candidate for the runner
          const candidate = {
            id: "v5-preferred-match",
            invariantRuleId: "v5-rule",
            primitiveIds: [pmPrimitiveId],
            targetPath:
              preferredMatch.ctx?.actionNodeId ??
              preferredMatch.ctx?.clickTarget?.nodeId ??
              clickTarget.nodeId,
            description: preferredMatch.row.label || "Apply primitive",
          };

          mapResult = {
            candidates: [candidate],
            resolvedSelectionPath: candidate.targetPath,
          };
        } else {
          // Preferred primitive not found in matches
          return {
            earlyReturn: {
              status: "no-candidates",
              engineResult: {
                ok: false,
                errorCode: "preferred-primitive-not-in-candidates",
              },
              history,
              debugInfo: {
                v5Status: "preferred-not-found",
                preferredPrimitiveId: req.preferredPrimitiveId,
                availableMatches: v5Outcome.matches.map((m: any) => m.row.id),
              },
            },
            isPrimitiveMasterPath: false,
            pmPrimitiveId: null,
          };
        }
      } else {
        // No preferredPrimitiveId - return choice to user
        this.log("[Orchestrator] V5 Blue Choice Detected - asking user");
        return {
          earlyReturn: {
            status: "choice",
            engineResult: null,
            history,
            choices: v5Outcome.matches?.map((m: any) => ({
              id: m.row.id,
              label: m.row.label || m.row.id,
              primitiveId: m.row.enginePrimitiveId || m.row.id,
              targetNodeId: m.ctx?.clickTarget?.nodeId,
            })),
            debugInfo: {
              v5Status: "ask-user",
              options: v5Outcome.matches,
            },
          },
          isPrimitiveMasterPath: false,
          pmPrimitiveId: null,
        };
      }
    } else if (v5Outcome.kind === "red-diagnostic") {
      // RED -> Diagnostic Message
      this.log("[Orchestrator] V5 Red Diagnostic Detected");
      return {
        earlyReturn: {
          status: "no-candidates",
          engineResult: null,
          history,
          debugInfo: {
            v5Status: "diagnostic",
            message: v5Outcome.primitive?.label,
          },
        },
        isPrimitiveMasterPath: false,
        pmPrimitiveId: null,
      };
    } else {
      mapResult = { candidates: [] };
    }

    return { mapResult, isPrimitiveMasterPath, pmPrimitiveId };
  }
  /**
   * Run a single step orchestration.
   */
  async runStep(
    ctx: OrchestratorContext,
    req: OrchestratorStepRequest
  ): Promise<OrchestratorStepResult> {
    this.log(`[Orchestrator] Processing step for session: ${req.sessionId}`);
    this.stepReq = req;

    const {
      courseId,
      selectionPath,
      expressionLatex,
      operatorIndex,
      preferredPrimitiveId,
      surfaceNodeKind,
    } = req;

    // 1. Load history from Session Service
    let history = await this.getHistory();

    // 2. Parse expression
    const ast = this.astParser.parse(expressionLatex);
    if (!ast) {
      return {
        status: "engine-error",
        engineResult: { ok: false, errorCode: "parse-error" },
        history,
      };
    }

    // 3. Get target invariant set
    const targetSet = ctx.invariantRegistry.getInvariantSetById(courseId);
    if (!targetSet) {
      return {
        status: "engine-error",
        engineResult: {
          ok: false,
          errorCode: `course-not-found: ${courseId}`,
        },
        history,
      };
    }

    // 4. Check for integer click (return choice)
    const clickedNodePath = selectionPath || "root";
    const clickedNode = this.astUtils.getNodeAt(ast, clickedNodePath);

    // Detect integer click either by AST node type OR by surfaceNodeKind
    const isIntegerByAst = clickedNode && clickedNode.type === "integer";
    const isIntegerBySurface =
      surfaceNodeKind === "Num" || surfaceNodeKind === "Number" || surfaceNodeKind === "Integer";

    if ((isIntegerByAst || isIntegerBySurface) && !preferredPrimitiveId) {
      // Determine the target node ID for the choice
      let targetPath = clickedNodePath;
      let intValue: any = null;

      if (isIntegerByAst && clickedNode) {
        intValue = (clickedNode as any).value;
      } else if (isIntegerBySurface && ast) {
        // Surface says it's a number but AST path doesn't resolve to integer
        // This happens when selectionPath is null/root - try to find first integer in AST
        const firstIntPath = this.findFirstIntegerPath(ast);
        if (firstIntPath) {
          targetPath = firstIntPath;
          const intNode = this.astUtils.getNodeAt(ast, firstIntPath);
          intValue = intNode ? (intNode as any).value : null;
        }
      }

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
          },
        ],
        debugInfo: {
          clickedNodeType: "integer",
          clickedNodePath,
          targetNodeId: targetPath,
          integerValue: intValue,
          detectedByAst: isIntegerByAst,
          detectedBySurface: isIntegerBySurface,
        },
      };
    }

    // 5. Handle preferred primitive (direct execution)
    if (preferredPrimitiveId === "P.INT_TO_FRAC") {
      const result = this.executeIntToFrac(ast, selectionPath || "root", expressionLatex);
      if (result.ok) {
        history = this.stepHistoryService.updateLastStep(history, {
          expressionAfter: result.newLatex,
        });
        await this.updateHistory(history);
      }
      return {
        status: result.ok ? "step-applied" : "engine-error",
        engineResult: result.ok
          ? { ok: true, newExpressionLatex: result.newLatex }
          : { ok: false, errorCode: result.error },
        history,
        primitiveDebug: {
          primitiveId: "P.INT_TO_FRAC",
          status: result.ok ? "ready" : "error",
          domain: "direct-execution",
          reason: "preferredPrimitiveId-bypass",
        },
      };
    }

    // 5b. Handle P.ONE_TO_TARGET_DENOM (direct execution)
    if (preferredPrimitiveId === "P.ONE_TO_TARGET_DENOM") {
      const result = this.executeOneToTargetDenom(ast, selectionPath || "root");
      if (result.ok) {
        history = this.stepHistoryService.updateLastStep(history, {
          expressionAfter: result.newLatex,
        });
        await this.updateHistory(history);
      }
      return {
        status: result.ok ? "step-applied" : "engine-error",
        engineResult: result.ok
          ? { ok: true, newExpressionLatex: result.newLatex }
          : { ok: false, errorCode: result.error },
        history,
        primitiveDebug: {
          primitiveId: "P.ONE_TO_TARGET_DENOM",
          status: result.ok ? "ready" : "error",
          domain: "direct-execution",
          reason: "preferredPrimitiveId-bypass",
        },
      };
    }

    // 5c. V5 PrimitiveMaster Integration (if available)
    let mapResult: { candidates: any[]; resolvedSelectionPath?: string } | undefined;
    let isPrimitiveMasterPath = false;
    let pmPrimitiveId: string | null = null;

    if (ctx.primitiveMaster && ast) {
      this.log("[Orchestrator] Using V5 PrimitiveMaster Path");

      // Augment AST with IDs (Surface Map)
      this.augmentAstWithIds(ast);
      this.log(`[V5-ORCH] rootAst.id=${(ast as any).id}, kind=${ast.type}`);

      // Resolve Click Target
      const clickTarget = ctx.primitiveMaster.resolveClickTarget(
        ast,
        selectionPath || "",
        operatorIndex
      );

      if (clickTarget) {
        // Resolve Primitive (Match -> Select)
        const v5Outcome = await ctx.primitiveMaster.resolvePrimitive({
          expressionId: "expr-temp",
          expressionLatex: expressionLatex,
          click: clickTarget,
          preferredPrimitiveId: preferredPrimitiveId,
          ast: ast,
        });

        // Handle V5 Outcome
        const v5Result = await this.handleV5Outcome(v5Outcome, req, clickTarget, history);

        // Check for early return (choice, diagnostic, error)
        if (v5Result.earlyReturn) {
          return v5Result.earlyReturn;
        }

        // Set results from V5
        mapResult = v5Result.mapResult;
        isPrimitiveMasterPath = v5Result.isPrimitiveMasterPath;
        pmPrimitiveId = v5Result.pmPrimitiveId;
      } else {
        this.log("[Orchestrator] Click target could not be resolved in V5.");
        mapResult = { candidates: [] };
      }
    }

    // 5d. Fallback to Legacy MapMaster if V5 didn't produce candidates
    if (!mapResult || mapResult.candidates.length === 0) {
      // Legacy MapMaster Path
      mapResult = this.mapMaster.generate({
        expressionLatex: expressionLatex,
        selectionPath: selectionPath,
        operatorIndex: operatorIndex,
        invariantSetIds: [targetSet.id],
        registry: ctx.invariantRegistry,
      });

      this.log(`[Orchestrator] MapMaster returned ${mapResult.candidates.length} candidates`);

      // 5d-1. Enforce Locality (Stage-1)
      // Filter candidates to only those local to the user's selection
      if (!isPrimitiveMasterPath) {
        // Only apply locality filtering for legacy MapMaster path
        const beforeLocality = mapResult.candidates.length;
        mapResult.candidates = mapResult.candidates.filter((c) => {
          return isLocalToSelection(selectionPath, mapResult.resolvedSelectionPath, c);
        });
        const afterLocality = mapResult.candidates.length;
        if (beforeLocality !== afterLocality) {
          this.log(
            `[Orchestrator] Locality filtered candidates: ${beforeLocality} -> ${afterLocality}`
          );
        }
      }

      // 5d-2. Operator Anchoring (Stage-1 Fix)
      // If user clicked an operator, anchor candidates to that specific operator node
      let operatorAnchorPath: string | null = null;
      if (!isPrimitiveMasterPath && ast) {
        operatorAnchorPath = getOperatorAnchorPath(
          ast,
          mapResult.resolvedSelectionPath,
          selectionPath,
          operatorIndex,
          (a, p) => this.astUtils.getNodeAt(a, p)
        );

        if (operatorAnchorPath) {
          const beforeAnchor = mapResult.candidates.length;
          const anchoredCandidates = mapResult.candidates.filter(
            (c) => c.targetPath === operatorAnchorPath
          );

          if (anchoredCandidates.length > 0) {
            mapResult.candidates = anchoredCandidates;
            this.log(
              `[Orchestrator] Operator anchored to \"${operatorAnchorPath}\": ${beforeAnchor} -> ${anchoredCandidates.length} candidates`
            );
          } else {
            // No candidates match the operator anchor - clear all
            mapResult.candidates = [];
            this.log(
              `[Orchestrator] Operator anchor \"${operatorAnchorPath}\" matched no candidates, cleared all`
            );
          }
        }
      }
    }

    // 5e. Preferred Primitive Filtering (CRITICAL for hint apply)
    // If the caller provided a preferredPrimitiveId, we MUST only consider
    // candidates whose PRIMARY primitive matches it. Otherwise, the orchestrator
    // may apply a different "best" step, which breaks the intended explicit action.
    if (preferredPrimitiveId && mapResult && Array.isArray(mapResult.candidates)) {
      const before = mapResult.candidates.length;
      mapResult.candidates = mapResult.candidates.filter((c) => {
        const prims = (c as any).primitiveIds;
        return Array.isArray(prims) && prims.length > 0 && prims[0] === preferredPrimitiveId;
      });
      const after = mapResult.candidates.length;
      this.log(
        `[Orchestrator] preferredPrimitiveId="${preferredPrimitiveId}" filtered candidates: ${before} -> ${after}`
      );
    }

    // 6. Check for no candidates
    if (!mapResult || mapResult.candidates.length === 0) {
      return {
        status: "no-candidates",
        engineResult: null,
        history,
      };
    }

    // 7. Let StepMaster decide
    const snapshot = this.stepHistoryService.getSnapshot(history);

    // Compute operator anchor path for StepMaster actionTarget
    let operatorAnchorPathForStepMaster: string | null = null;
    if (!isPrimitiveMasterPath && ast) {
      operatorAnchorPathForStepMaster = getOperatorAnchorPath(
        ast,
        mapResult.resolvedSelectionPath,
        selectionPath,
        operatorIndex,
        (a, p) => this.astUtils.getNodeAt(a, p)
      );
    }

    const decision = this.stepMaster.decide({
      candidates: mapResult.candidates,
      history: snapshot,
      policy: ctx.policy,
      // Pass the strict action target (operator anchor if available, else selection path)
      actionTarget: operatorAnchorPathForStepMaster || mapResult.resolvedSelectionPath,
    });

    if (decision.decision.status === "no-candidates") {
      return {
        status: "no-candidates",
        engineResult: null,
        history,
        debugInfo: {
          allCandidates: mapResult.candidates,
        },
      };
    }

    // 8. Execute the chosen primitive
    const chosenCandidate = mapResult.candidates.find(
      (c) => c.id === decision.decision.chosenCandidateId
    );

    if (!chosenCandidate || decision.primitivesToApply.length === 0) {
      return {
        status: "engine-error",
        engineResult: { ok: false, errorCode: "no-primitive-to-apply" },
        history,
      };
    }

    const engineResult = await this.engineRunner.executeStep({
      expressionLatex: expressionLatex,
      primitiveId: decision.primitivesToApply[0].id,
      targetPath: chosenCandidate.targetPath,
      bindings: chosenCandidate.bindings,
    });

    // 9. Update history
    if (engineResult.ok && engineResult.newExpressionLatex) {
      history = this.stepHistoryService.appendStep(history, {
        expressionBefore: expressionLatex,
        expressionAfter: engineResult.newExpressionLatex,
        invariantRuleId: chosenCandidate.invariantRuleId,
        targetPath: chosenCandidate.targetPath,
        primitiveIds: chosenCandidate.primitiveIds,
      });
      await this.updateHistory(history);
    }

    return {
      status: engineResult.ok ? "step-applied" : "engine-error",
      engineResult,
      history,
      debugInfo: {
        chosenCandidateId: decision.decision.chosenCandidateId,
        allCandidates: mapResult.candidates,
        isPrimitiveMasterPath,
        pmPrimitiveId,
      },
    };
  }

  /**
   * Execute INT_TO_FRAC transformation.
   */
  private executeIntToFrac(
    ast: any,
    targetPath: string,
    _originalLatex: string
  ): { ok: boolean; newLatex?: string; error?: string } {
    const targetNode = this.astUtils.getNodeAt(ast, targetPath);

    if (!targetNode || targetNode.type !== "integer") {
      return {
        ok: false,
        error: `Target is not integer, got ${targetNode?.type || "null"}`,
      };
    }

    const intValue = (targetNode as any).value;
    const fractionNode = {
      type: "fraction" as const,
      numerator: intValue,
      denominator: "1",
    };

    const newAst = this.astUtils.replaceNodeAt(ast, targetPath, fractionNode);
    const newLatex = this.astUtils.toLatex(newAst);

    return { ok: true, newLatex };
  }

  /**
   * Execute ONE_TO_TARGET_DENOM transformation.
   * Converts "1" to "d/d" where d is the opposite fraction's denominator.
   */
  private executeOneToTargetDenom(
    ast: any,
    targetPath: string
  ): { ok: boolean; newLatex?: string; error?: string } {
    const targetNode = this.astUtils.getNodeAt(ast, targetPath);

    // Validate target is integer "1"
    if (!targetNode || targetNode.type !== "integer" || (targetNode as any).value !== "1") {
      return {
        ok: false,
        error: `Target must be integer "1", got ${targetNode?.type}:${(targetNode as any)?.value}`,
      };
    }

    // Find parent (should be multiplication: frac * 1)
    const pathParts = targetPath.split(".");
    if (pathParts.length < 2) {
      return {
        ok: false,
        error: "Path too short to find parent",
      };
    }

    pathParts.pop();
    const parentPath = pathParts.join(".") || "root";
    const parent = this.astUtils.getNodeAt(ast, parentPath);

    if (!parent || parent.type !== "binaryOp" || parent.op !== "*") {
      return {
        ok: false,
        error: `Parent must be *, got ${parent?.type}:${(parent as any)?.op}`,
      };
    }

    // Find grandparent (should be + or -)
    pathParts.pop();
    const grandParentPath = pathParts.length > 0 ? pathParts.join(".") : "root";
    const grandParent =
      grandParentPath === "root" ? ast : this.astUtils.getNodeAt(ast, grandParentPath);

    if (
      !grandParent ||
      grandParent.type !== "binaryOp" ||
      (grandParent.op !== "+" && grandParent.op !== "-")
    ) {
      return {
        ok: false,
        error: `Grandparent must be +/-, got ${grandParent?.type}:${(grandParent as any)?.op}`,
      };
    }

    // Determine which side we're on and find opposite branch
    const parentIsLeft = parent === grandParent.left;
    const otherBranch = parentIsLeft ? grandParent.right : grandParent.left;

    // Extract denominator from other branch
    const extractDenom = (node: any): string | undefined => {
      if (node.type === "binaryOp" && node.op === "*") {
        if (node.left.type === "fraction") return node.left.denominator;
        if (node.right.type === "fraction") return node.right.denominator;
      }
      if (node.type === "fraction") return node.denominator;
      return undefined;
    };

    const oppositeD = extractDenom(otherBranch);
    if (!oppositeD) {
      return {
        ok: false,
        error: "Could not find opposite denominator",
      };
    }

    // Replace "1" with fraction d/d
    const newFraction = {
      type: "fraction" as const,
      numerator: oppositeD,
      denominator: oppositeD,
    };

    const newAst = this.astUtils.replaceNodeAt(ast, targetPath, newFraction);
    const newLatex = this.astUtils.toLatex(newAst);

    return { ok: true, newLatex };
  }

  /**
   * Undo the last step in the session.
   * Returns the previous expression or null if no history.
   */
  async undoLastStep(sessionId: string): Promise<string | null> {
    const history = await this.sessionService.getHistory(sessionId);

    if (history.entries.length === 0) {
      return null;
    }

    const lastEntry = history.entries[history.entries.length - 1];
    const previousExpression = lastEntry.expressionBefore;

    const newHistory = this.stepHistoryService.removeLastStep(history);
    await this.sessionService.updateHistory(sessionId, newHistory);

    return previousExpression;
  }

  /**
   * Generate a hint for the current expression.
   */
  async generateHint(
    ctx: OrchestratorContext,
    req: OrchestratorStepRequest
  ): Promise<{ status: string; hintText?: string; error?: string }> {
    const history = await this.getHistory();
    const targetSet = ctx.invariantRegistry.getInvariantSetById(req.courseId);

    if (!targetSet) {
      return { status: "error", error: `course-not-found: ${req.courseId}` };
    }

    const mapResult = this.mapMaster.generate({
      expressionLatex: req.expressionLatex,
      selectionPath: req.selectionPath,
      operatorIndex: req.operatorIndex,
      invariantSetIds: [targetSet.id],
      registry: ctx.invariantRegistry,
    });

    const snapshot = this.stepHistoryService.getSnapshot(history);
    const decision = this.stepMaster.decide({
      candidates: mapResult.candidates,
      history: snapshot,
      policy: ctx.policy,
      actionTarget: req.selectionPath,
    });

    if (decision.decision.status === "chosen") {
      const chosenId = decision.decision.chosenCandidateId;
      const chosenCandidate = mapResult.candidates.find((c) => c.id === chosenId);

      if (chosenCandidate) {
        return {
          status: "hint-found",
          hintText: chosenCandidate.description,
        };
      }
    }

    return { status: "no-hint" };
  }
}

/**
 * Factory function for StepOrchestrator
 */
export function createStepOrchestrator(): StepOrchestrator {
  return container.resolve(StepOrchestrator);
}
