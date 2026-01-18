/**
 * ApiRouter.ts
 *
 * Main API route handlers for student-facing and core endpoints.
 */

import type { IncomingMessage, ServerResponse } from "node:http";

import { HandlerPostEntryStep } from "../../server/HandlerPostEntryStep.js";
import { handlePostHintRequest } from "../../server/HandlerPostHintRequest.js";
import { HandlerPostUndoStep } from "../../server/HandlerPostUndoStep.js";
import { handleGetStudentProgress } from "../../server/HandlerReporting.js";
import { HttpUtils } from "../utils/HttpUtils.js";
import { BaseRouter, type RouterDeps } from "./BaseRouter.js";

/**
 * Router for main API endpoints.
 * Handles student-facing engine endpoints and core application routes.
 */
export class ApiRouter extends BaseRouter {
  constructor(deps: RouterDeps) {
    super(deps);
  }

  protected registerRoutes(): void {
    // Health check
    this.get("/health", this.handleHealth.bind(this));

    // Student progress (teacher view)
    this.get(
      "/api/teacher/student-progress",
      this.handleStudentProgress.bind(this),
    );

    // Core engine endpoints
    this.post("/api/entry-step", this.handleEntryStep.bind(this));
    this.post("/engine/step", this.handleEntryStep.bind(this)); // Backward compat
    this.post("/api/undo-step", this.handleUndoStep.bind(this));
    this.post("/api/hint-request", this.handleHintRequest.bind(this));

    // Orchestrator V5
    this.post(
      "/api/orchestrator/v5/step",
      this.handleOrchestratorV5.bind(this),
    );

    // Instrumentation endpoint
    this.post("/api/instrument", this.handleInstrument.bind(this));

    // Operator validation
    this.post(
      "/api/v1/validate-operator",
      this.handleValidateOperator.bind(this),
    );
  }

  /**
   * GET /health - Health check endpoint.
   */
  private async handleHealth(
    _req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("ok");
  }

  /**
   * GET /api/teacher/student-progress - Get student progress.
   */
  private async handleStudentProgress(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    await handleGetStudentProgress(req, res);
  }

  /**
   * POST /api/entry-step - Main entry step endpoint.
   */
  private async handleEntryStep(
    _req: IncomingMessage,
    res: ServerResponse,
    body?: unknown,
  ): Promise<void> {
    const response = await HandlerPostEntryStep(body, this.handlerDeps);
    HttpUtils.sendJson(res, 200, response);
  }

  /**
   * POST /api/undo-step - Undo step endpoint.
   */
  private async handleUndoStep(
    _req: IncomingMessage,
    res: ServerResponse,
    body?: unknown,
  ): Promise<void> {
    const response = await HandlerPostUndoStep(body, this.handlerDeps);
    HttpUtils.sendJson(res, 200, response);
  }

  /**
   * POST /api/hint-request - Hint request endpoint.
   */
  private async handleHintRequest(
    _req: IncomingMessage,
    res: ServerResponse,
    body?: unknown,
  ): Promise<void> {
    const response = await handlePostHintRequest(body, this.handlerDeps);
    HttpUtils.sendJson(res, 200, response);
  }

  /**
   * POST /api/orchestrator/v5/step - Orchestrator V5 endpoint.
   */
  private async handleOrchestratorV5(
    _req: IncomingMessage,
    res: ServerResponse,
    body?: unknown,
  ): Promise<void> {
    const { handlePostOrchestratorStepV5 } =
      await import("../../server/HandlerPostOrchestratorStepV5.js");
    const response = await handlePostOrchestratorStepV5(body, this.handlerDeps);
    HttpUtils.sendJson(res, 200, response);
  }

  /**
   * POST /api/instrument - Stable-ID instrumentation endpoint.
   */
  private async handleInstrument(
    req: IncomingMessage,
    res: ServerResponse,
    body?: unknown,
  ): Promise<void> {
    const { handlePostInstrument } =
      await import("../../server/HandlerPostInstrument.js");
    await handlePostInstrument(req, res, body);
  }

  /**
   * POST /api/v1/validate-operator - Operator validation endpoint.
   */
  private async handleValidateOperator(
    _req: IncomingMessage,
    res: ServerResponse,
    body?: unknown,
  ): Promise<void> {
    const parsedBody = body as {
      latex?: string;
      operatorPath?: string;
    };

    if (!parsedBody?.latex || typeof parsedBody.latex !== "string") {
      HttpUtils.sendJson(res, 400, {
        ok: false,
        error: "invalid-request",
        message: "Missing or invalid 'latex' field",
      });
      return;
    }

    const { validateOperatorContext } =
      await import("../../mapmaster/validation.utils.js");

    const path = parsedBody.operatorPath || "root";
    const result = validateOperatorContext(parsedBody.latex, path);

    if (!result) {
      HttpUtils.sendJson(res, 200, {
        ok: false,
        validationType: null,
        reason: "validation-failed",
        message: "Could not validate operator at path",
        latex: parsedBody.latex,
        operatorPath: path,
      });
      return;
    }

    HttpUtils.sendJson(res, 200, {
      ok: true,
      validationType: result.validationType,
      reason: result.reason,
      operatorType: result.operatorType,
      leftOperandType: result.leftOperandType,
      rightOperandType: result.rightOperandType,
      latex: parsedBody.latex,
      operatorPath: path,
    });
  }
}
