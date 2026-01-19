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
import { StepHistoryService } from "../stepmaster/StepHistory.js";
import { StepMaster } from "../stepmaster/StepMaster.js";
import type { StepHistory } from "../stepmaster/stepmaster.types.js";
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
   * Run a single step orchestration.
   */
  async runStep(
    ctx: OrchestratorContext,
    req: OrchestratorStepRequest
  ): Promise<OrchestratorStepResult> {
    this.log(`[Orchestrator] Processing step for session: ${req.sessionId}`);
    this.stepReq = req;

    const { courseId, selectionPath, expressionLatex, operatorIndex, preferredPrimitiveId } = req;

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
    const clickedNode = this.astUtils.getNodeAt(ast, selectionPath || "root");
    if (clickedNode?.type === "integer" && !preferredPrimitiveId) {
      return {
        status: "choice",
        engineResult: null,
        history,
        choices: [
          {
            id: "int-to-frac",
            label: "Convert to fraction",
            primitiveId: "P.INT_TO_FRAC",
            targetNodeId: selectionPath || "root",
          },
        ],
        debugInfo: {
          clickedNodeType: "integer",
          clickedNodePath: selectionPath,
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

    // 6. Generate candidates via MapMaster
    const mapResult = this.mapMaster.generate({
      expressionLatex: expressionLatex,
      selectionPath: selectionPath,
      operatorIndex: operatorIndex,
      invariantSetIds: [targetSet.id],
      registry: ctx.invariantRegistry,
    });

    this.log(`[Orchestrator] MapMaster returned ${mapResult.candidates.length} candidates`);

    if (mapResult.candidates.length === 0) {
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
      actionTarget: selectionPath,
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
}

/**
 * Factory function for StepOrchestrator
 */
export function createStepOrchestrator(): StepOrchestrator {
  return container.resolve(StepOrchestrator);
}
