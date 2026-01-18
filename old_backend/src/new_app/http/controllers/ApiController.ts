/**
 * ApiController Class
 *
 * Handles main API endpoints for student-facing and core operations.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import type { StepOrchestrator } from "../../core/orchestrator/StepOrchestrator.js";
import type { OrchestratorContext } from "../../core/orchestrator/orchestrator.types.js";
import {
  BaseController,
  type ControllerDependencies,
} from "./BaseController.js";

export interface ApiControllerDeps extends ControllerDependencies {
  orchestrator: StepOrchestrator;
  orchestratorContext: OrchestratorContext;
}

/**
 * ApiController - Main API endpoints
 */
export class ApiController extends BaseController {
  private readonly orchestrator: StepOrchestrator;
  private readonly context: OrchestratorContext;

  constructor(deps: ApiControllerDeps) {
    super(deps);
    this.orchestrator = deps.orchestrator;
    this.context = deps.orchestratorContext;
  }

  /**
   * GET /health - Health check endpoint.
   */
  async handleHealth(
    _req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("ok");
  }

  /**
   * POST /api/entry-step - Main entry step endpoint.
   */
  async handleEntryStep(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const body = await this.parseBody<{
      sessionId?: string;
      courseId?: string;
      expressionLatex?: string;
      selectionPath?: string;
      operatorIndex?: number;
      userRole?: string;
      userId?: string;
      preferredPrimitiveId?: string;
    }>(req);

    if (!body) {
      this.sendError(res, 400, "Invalid request body");
      return;
    }

    if (!body.sessionId || !body.courseId || !body.expressionLatex) {
      this.sendError(res, 400, "Missing required fields");
      return;
    }

    try {
      const result = await this.orchestrator.runStep(this.context, {
        sessionId: body.sessionId,
        courseId: body.courseId,
        expressionLatex: body.expressionLatex,
        selectionPath: body.selectionPath || null,
        operatorIndex: body.operatorIndex,
        userRole: (body.userRole as "student" | "teacher") || "student",
        userId: body.userId,
        preferredPrimitiveId: body.preferredPrimitiveId,
      });

      this.sendJson(res, 200, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log(`[ApiController] Entry step failed: ${message}`);
      this.sendError(res, 500, "Internal server error");
    }
  }

  /**
   * POST /api/undo-step - Undo step endpoint.
   */
  async handleUndoStep(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const body = await this.parseBody<{ sessionId?: string }>(req);

    if (!body?.sessionId) {
      this.sendError(res, 400, "Missing sessionId");
      return;
    }

    // TODO: Implement undo logic
    this.sendJson(res, 200, { ok: true, message: "Undo not yet implemented" });
  }

  /**
   * POST /api/hint-request - Hint request endpoint.
   */
  async handleHintRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const body = await this.parseBody<{
      sessionId?: string;
      courseId?: string;
      expressionLatex?: string;
      selectionPath?: string;
    }>(req);

    if (!body) {
      this.sendError(res, 400, "Invalid request body");
      return;
    }

    // TODO: Implement hint logic
    this.sendJson(res, 200, {
      hintText: "Try simplifying the expression",
      suggestedPrimitiveId: null,
    });
  }
}
