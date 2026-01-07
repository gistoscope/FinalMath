/**
 * Orchestrator Service
 *
 * Handles the V5 orchestrator step endpoint.
 * Uses stub implementations for development.
 */

import type { Logger } from "pino";
import { inject, injectable } from "tsyringe";

import {
  type OrchestratorContext,
  type OrchestratorStepRequest,
  type OrchestratorStepResult,
  createTeacherDebugPolicy,
  runOrchestratorStep,
} from "../../core/stubs";

import { type HandlerDeps, HANDLER_DEPS_TOKEN } from "../../core/types";
import { OrchestratorStepV5Dto } from "./dtos/orchestrator-step.dto";

@injectable()
export class OrchestratorService {
  private log: (message: string) => void;
  private logger?: Logger;

  constructor(@inject(HANDLER_DEPS_TOKEN) private deps: HandlerDeps) {
    this.log = deps.log ?? (() => {});
    this.logger = deps.logger;
  }

  /**
   * Handle V5 Orchestrator Step
   */
  async handleStepV5(
    dto: OrchestratorStepV5Dto
  ): Promise<OrchestratorStepResult> {
    const {
      expressionLatex,
      sessionId,
      courseId,
      selectionPath,
      operatorIndex,
      preferredPrimitiveId,
      policyId,
      surfaceNodeKind,
      clickTargetKind,
      operator,
      surfaceNodeId,
    } = dto;

    try {
      // Construct Orchestrator Request with all V5 fields
      const request: OrchestratorStepRequest = {
        sessionId,
        courseId: courseId || "default",
        expressionLatex,
        selectionPath: selectionPath || null,
        operatorIndex,
        userRole: "student",
        userId: undefined,
        preferredPrimitiveId,
        surfaceNodeKind,
        clickTargetKind,
        operator,
        surfaceNodeId,
      };

      // Policy setup
      let policy = this.deps.policy;
      if (policyId === "teacher.debug") {
        policy = createTeacherDebugPolicy();
      }

      const ctx: OrchestratorContext = {
        invariantRegistry: this.deps.invariantRegistry,
        policy: policy,
        primitiveMaster: this.deps.primitiveMaster,
      };

      // Execute via Orchestrator
      const result = await runOrchestratorStep(ctx, request);

      this.logInfo(
        `[OrchestratorService] status=${result.status} session=${sessionId}`
      );

      return result;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error in handleStepV5.";
      this.logError(error, `[OrchestratorService] Error: ${message}`);

      return {
        status: "engine-error",
        engineResult: { ok: false, errorCode: message },
        history: { entries: [] },
        debugInfo: { error: message },
      };
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
