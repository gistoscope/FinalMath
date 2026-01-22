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
import { AstParser } from "../ast/parser.ast.js";
import { AstUtils } from "../ast/utils.ast.js";
import { EngineRunner } from "../engine";

import { StepMaster } from "../stepmaster/step-master.core.js";
import type { StepHistory } from "../stepmaster/step-master.types.js";
import type {
  OrchestratorContext,
  OrchestratorStepRequest,
  OrchestratorStepResult,
} from "./orchestrator.types.js";

// Executors
import { IntToFracExecutor, OneToTargetDenomExecutor } from "./executors/index.js";

// Handlers
import { IntegerClickHandler, LegacyCandidateHandler, V5OutcomeHandler } from "./handlers/index.js";

// Filters
import { PreferredPrimitiveFilter } from "./filters/index.js";

// Utils
import { StepHistoryService } from "../stepmaster/index.js";
import { DebugInfoBuilder } from "./utils/index.js";

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
    private readonly engineRunner: EngineRunner,
    private readonly stepHistoryService: StepHistoryService,
    private readonly astUtils: AstUtils,
    private readonly astParser: AstParser,
    // Executors
    private readonly intToFracExecutor: IntToFracExecutor,
    private readonly oneToTargetDenomExecutor: OneToTargetDenomExecutor,
    // Handlers
    private readonly integerClickHandler: IntegerClickHandler,
    private readonly v5OutcomeHandler: V5OutcomeHandler,
    private readonly legacyCandidateHandler: LegacyCandidateHandler,
    // Filters
    private readonly preferredPrimitiveFilter: PreferredPrimitiveFilter,
    // Utils
    private readonly debugInfoBuilder: DebugInfoBuilder
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
    const intResult = this.integerClickHandler.handle(
      ast,
      selectionPath,
      surfaceNodeKind,
      preferredPrimitiveId,
      history
    );
    if (intResult.shouldReturnChoice) {
      return intResult.choice!;
    }

    // 5. Handle preferred primitive (direct execution)
    if (preferredPrimitiveId === "P.INT_TO_FRAC") {
      const result = this.intToFracExecutor.execute(ast, selectionPath || "root");
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
        primitiveDebug: this.debugInfoBuilder.buildPrimitiveDebug({
          primitiveId: "P.INT_TO_FRAC",
          status: result.ok ? "ready" : "error",
          domain: "direct-execution",
          reason: "preferredPrimitiveId-bypass",
        }),
      };
    }

    // 5b. Handle P.ONE_TO_TARGET_DENOM (direct execution)
    if (preferredPrimitiveId === "P.ONE_TO_TARGET_DENOM") {
      const result = this.oneToTargetDenomExecutor.execute(ast, selectionPath || "root");
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
        primitiveDebug: this.debugInfoBuilder.buildPrimitiveDebug({
          primitiveId: "P.ONE_TO_TARGET_DENOM",
          status: result.ok ? "ready" : "error",
          domain: "direct-execution",
          reason: "preferredPrimitiveId-bypass",
        }),
      };
    }

    // 5c. V5 PrimitiveMaster Integration (if available)
    let mapResult: { candidates: any[]; resolvedSelectionPath?: string } | undefined;
    let isPrimitiveMasterPath = false;
    let pmPrimitiveId: string | null | undefined = null;

    if (ctx.primitiveMaster && ast) {
      this.log("[Orchestrator] Using V5 PrimitiveMaster Path");

      // Augment AST with IDs (Surface Map)
      this.astUtils.augmentAstWithIds(ast);
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

        // Handle V5 Outcome using handler
        const v5Result = await this.v5OutcomeHandler.handle(v5Outcome, req, clickTarget, history);

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
      // Use LegacyCandidateHandler
      const legacyResult = this.legacyCandidateHandler.generate({
        expressionLatex,
        selectionPath,
        operatorIndex,
        invariantSetIds: [targetSet.id],
        registry: ctx.invariantRegistry,
        ast,
        isPrimitiveMasterPath,
      });

      mapResult = legacyResult;
    }

    // 5e. Preferred Primitive Filtering
    if (preferredPrimitiveId && mapResult && Array.isArray(mapResult.candidates)) {
      mapResult.candidates = this.preferredPrimitiveFilter.apply(
        mapResult.candidates,
        preferredPrimitiveId
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

    const decision = this.stepMaster.decide({
      candidates: mapResult.candidates,
      history: snapshot,
      policy: ctx.policy,
      actionTarget: mapResult.resolvedSelectionPath,
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
      debugInfo: this.debugInfoBuilder.buildCandidateDebug({
        chosenCandidateId: decision.decision.chosenCandidateId,
        allCandidates: mapResult.candidates,
        isPrimitiveMasterPath,
        pmPrimitiveId,
      }),
    };
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

    // Use LegacyCandidateHandler
    const ast = this.astParser.parse(req.expressionLatex);
    if (!ast) {
      return { status: "error", error: "parse-error" };
    }

    const legacyResult = this.legacyCandidateHandler.generate({
      expressionLatex: req.expressionLatex,
      selectionPath: req.selectionPath,
      operatorIndex: req.operatorIndex,
      invariantSetIds: [targetSet.id],
      registry: ctx.invariantRegistry,
      ast,
      isPrimitiveMasterPath: false,
    });

    const snapshot = this.stepHistoryService.getSnapshot(history);
    const decision = this.stepMaster.decide({
      candidates: legacyResult.candidates,
      history: snapshot,
      policy: ctx.policy,
      actionTarget: req.selectionPath,
    });

    if (decision.decision.status === "chosen") {
      const chosenId = decision.decision.chosenCandidateId;
      const chosenCandidate = legacyResult.candidates.find((c) => c.id === chosenId);

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
