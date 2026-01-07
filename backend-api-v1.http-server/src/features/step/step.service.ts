/**
 * Step Service
 *
 * Implements logic for processing math steps (entry and undo),
 * mirroring the original HandlerPostEntryStep and HandlerPostUndoStep.
 */

import type { Logger } from "pino";
import { inject, injectable } from "tsyringe";

import {
  createTeacherDebugPolicy,
  runOrchestratorStep,
  SessionService,
  type EngineStepResponse,
  type OrchestratorContext,
  type OrchestratorStepRequest,
} from "../../core/stubs";

import { HANDLER_DEPS_TOKEN, type HandlerDeps } from "../../core/types";
import { Token } from "../auth/token.helpers";
import { StepEntryDto, StepUndoDto } from "./dtos";

@injectable()
export class StepService {
  private log: (message: string) => void;
  private logger?: Logger;

  constructor(
    @inject(HANDLER_DEPS_TOKEN) private deps: HandlerDeps,
    private readonly tokenService: Token
  ) {
    this.log = deps.log ?? (() => {});
    this.logger = deps.logger;
  }

  /**
   * Handle entry step request.
   */
  async handleEntry(dto: StepEntryDto): Promise<EngineStepResponse> {
    try {
      // 1. Auth & Role Extraction
      let userRole: string = "student";
      let userId: string | undefined;

      if (dto.token) {
        const validated = this.tokenService.validateToken(dto.token);
        if (validated) {
          userRole = validated.role;
          userId = validated.id;
        }
      }

      // 2. Policy Configuration
      let policy = this.deps.policy;
      if (dto.policyId === "teacher.debug") {
        policy = createTeacherDebugPolicy();
      }

      // 3. Build Orchestrator Context
      const ctx: OrchestratorContext = {
        invariantRegistry: this.deps.invariantRegistry,
        policy,
        primitiveMaster: this.deps.primitiveMaster,
      };

      // 4. Build Request
      const req: OrchestratorStepRequest = {
        sessionId: dto.sessionId || `session-${Date.now()}`,
        courseId: dto.courseId || "default",
        expressionLatex: dto.expressionLatex,
        selectionPath: dto.selectionPath || null,
        operatorIndex: dto.operatorIndex,
        userRole: userRole as any,
        userId,
        preferredPrimitiveId: dto.preferredPrimitiveId,
      };

      // 5. Execute Step (delegate to orchestrator)
      const result = await runOrchestratorStep(ctx, req);

      this.logInfo(
        `[StepService] Entry step processed. Status=${result.status}`
      );

      // 6. Map to EngineStepResponse (Protocol Compliant)
      let responseLatex = req.expressionLatex;
      if (
        result.status === "step-applied" &&
        result.engineResult?.newExpressionLatex
      ) {
        responseLatex = result.engineResult.newExpressionLatex;
      }

      return {
        status: result.status,
        expressionLatex: responseLatex,
        debugInfo: result.debugInfo as any,
        primitiveDebug: result.primitiveDebug,
        choices: result.choices,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logError(error, `[StepService] handleEntry Error: ${message}`);
      return {
        status: "engine-error",
        expressionLatex: dto.expressionLatex || "",
        debugInfo: null,
      };
    }
  }

  /**
   * Handle undo step request.
   */
  async handleUndo(dto: StepUndoDto): Promise<any> {
    const { sessionId } = dto;
    try {
      const history = await SessionService.getHistory(sessionId);

      if (!history.entries || history.entries.length === 0) {
        return { status: "no-history", expressionLatex: "" };
      }

      // Remove the last step
      history.entries.pop();
      await SessionService.updateHistory(sessionId, history);

      const lastEntry = history.entries[history.entries.length - 1];
      const newLatex = lastEntry?.expressionAfter || "";

      this.logInfo(`[StepService] Undo applied for session=${sessionId}`);

      return { status: "undo-complete", expressionLatex: newLatex };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logError(error, `[StepService] handleUndo Error: ${message}`);
      return { status: "error", expressionLatex: "", error: message };
    }
  }

  private logInfo(msg: string) {
    if (this.logger) this.logger.info(msg);
    else this.log(msg);
  }

  private logError(error: unknown, msg: string) {
    if (this.logger) this.logger.error({ err: error }, msg);
    else this.log(msg);
  }
}
