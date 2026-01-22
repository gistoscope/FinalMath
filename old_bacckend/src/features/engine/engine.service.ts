/**
 * Engine Service
 *
 * Handles the core step operations: entry-step, undo-step, hint-request.
 * Uses stub implementations for development.
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
import { EntryStepDto, HintRequestDto, UndoStepDto } from "./dtos";

@injectable()
export class EngineService {
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
   * Handle entry-step request.
   */
  async handleEntryStep(dto: EntryStepDto): Promise<EngineStepResponse> {
    const {
      expressionLatex,
      sessionId,
      courseId,
      selectionPath,
      operatorIndex,
      policyId,
      token,
      preferredPrimitiveId,
    } = dto;

    try {
      // Auth & Role Extraction
      let userRole: string = "student";
      let userId: string | undefined;

      if (token) {
        const validated = this.tokenService.validateToken(token);
        if (validated) {
          userRole = validated.role;
          userId = validated.id;
        }
      }

      // Policy Configuration
      let policy = this.deps.policy;
      if (policyId === "teacher.debug") {
        policy = createTeacherDebugPolicy();
      }

      // Build Orchestrator Context
      const ctx: OrchestratorContext = {
        invariantRegistry: this.deps.invariantRegistry,
        policy,
        primitiveMaster: this.deps.primitiveMaster,
      };

      // Build Request
      const req: OrchestratorStepRequest = {
        sessionId: sessionId || `session-${Date.now()}`,
        courseId: courseId || "default",
        expressionLatex,
        selectionPath: selectionPath || null,
        operatorIndex,
        userRole: userRole as any,
        userId,
        preferredPrimitiveId,
      };

      // Execute Step
      const result = await runOrchestratorStep(ctx, req);

      this.logInfo(
        `[EngineService] status=${result.status} session=${req.sessionId}`
      );

      // Map to EngineStepResponse
      if (result.status === "step-applied" && result.engineResult?.ok) {
        return {
          ok: true,
          newExpressionLatex: result.engineResult.newExpressionLatex,
        } as any;
      }

      return {
        ok: false,
        errorCode: result.engineResult?.errorCode || result.status,
      } as any;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error in handleEntryStep.";
      this.logError(error, `[EngineService] Error: ${message}`);

      return { ok: false, errorCode: message } as any;
    }
  }

  /**
   * Handle undo-step request.
   */
  async handleUndoStep(dto: UndoStepDto): Promise<EngineStepResponse> {
    const { sessionId } = dto;

    try {
      const history = await SessionService.getHistory(sessionId);

      if (!history.entries || history.entries.length === 0) {
        return { ok: false, errorCode: "no-history-to-undo" } as any;
      }

      // Remove the last step
      history.entries.pop();
      await SessionService.updateHistory(sessionId, history);

      const lastEntry = history.entries[history.entries.length - 1];
      const newLatex = lastEntry?.expressionAfter || "";

      this.logInfo(`[EngineService] Undo applied for session=${sessionId}`);

      return { ok: true, newExpressionLatex: newLatex } as any;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error in handleUndoStep.";
      this.logError(error, `[EngineService] Error: ${message}`);

      return { ok: false, errorCode: message } as any;
    }
  }

  /**
   * Handle hint-request.
   */
  async handleHintRequest(
    dto: HintRequestDto
  ): Promise<{ hint?: string; primitiveId?: string; errorCode?: string }> {
    const { expressionLatex, sessionId, courseId } = dto;

    try {
      // Stub implementation - just acknowledge the request
      this.logInfo(
        `[EngineService] Hint requested for expression: ${expressionLatex}`
      );

      return {
        hint: "Hint generation is not yet implemented in the stub.",
        primitiveId: undefined,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error in handleHintRequest.";
      this.logError(error, `[EngineService] Error: ${message}`);

      return { errorCode: message };
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
