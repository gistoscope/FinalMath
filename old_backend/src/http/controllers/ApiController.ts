/**
 * ApiController Class
 *
 * Handles main API endpoints for student-facing and core operations.
 */

import type { Request, Response } from "express";
import { injectable } from "tsyringe";
import { Controller } from "../core/decorator/controller.decorator.js";
import { GET, POST } from "../core/decorator/routes.decorator.js";

/**
 * ApiController - Main API endpoints
 */
@injectable()
@Controller("")
export class ApiController {
  constructor() {}

  /**
   * GET /health - Health check endpoint.
   */
  @GET("/health")
  async handleHealth(_req: Request, res: Response): Promise<void> {
    res.status(200).send("ok");
  }

  /**
   * POST /api/entry-step - Main entry step endpoint.
   */
  @POST("/api/entry-step")
  @POST("/engine/step")
  // @POST("/api/orchestrator/v5/step")
  async handleEntryStep(req: Request, res: Response): Promise<void> {
    // clg
  }

  /**
   * POST /api/undo-step - Undo step endpoint.
   */
  @POST("/api/undo-step")
  async handleUndoStep(req: Request, res: Response): Promise<void> {
    const body = req.body as { sessionId?: string };

    if (!body?.sessionId) {
      res.status(400).json({ error: "Missing sessionId" });
      return;
    }

    // TODO: Implement undo logic
    res.status(200).json({ ok: true, message: "Undo not yet implemented" });
  }

  /**
   * POST /api/hint-request - Hint request endpoint.
   */
  @POST("/api/hint-request")
  async handleHintRequest(req: Request, res: Response): Promise<void> {
    // TODO: Implement hint logic
    res.status(200).json({
      hintText: "Try simplifying the expression",
      suggestedPrimitiveId: null,
    });
  }
}
