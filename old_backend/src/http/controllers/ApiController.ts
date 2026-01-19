/**
 * ApiController Class
 *
 * Handles main API endpoints for student-facing and core operations.
 */

import type { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { InvariantLoader, StepPolicy } from "../../core/index.js";
import { StepOrchestrator } from "../../core/orchestrator/StepOrchestrator.js";
import type { OrchestratorContext } from "../../core/orchestrator/orchestrator.types.js";
import { COURSES_DIR } from "../../registry.js";

/**
 * ApiController - Main API endpoints
 */
@injectable()
export class ApiController {
  private readonly context: OrchestratorContext;

  constructor(
    private readonly orchestrator: StepOrchestrator,
    readonly invariantLoader: InvariantLoader,
    private readonly stepPolicy: StepPolicy,
    @inject(COURSES_DIR) private readonly coursesDir: string
  ) {
    const loadResult = invariantLoader.loadFromDirectory(coursesDir);
    if (loadResult.errors.length > 0) {
      console.log(`[Application] Invariant loading warnings: ${loadResult.errors.join(", ")}`);
    }
    this.context = {
      invariantRegistry: loadResult.registry,
      policy: this.stepPolicy.createStudentPolicy(),
    };
  }

  /**
   * GET /health - Health check endpoint.
   */
  async handleHealth(_req: Request, res: Response): Promise<void> {
    res.status(200).send("ok");
  }

  /**
   * POST /api/entry-step - Main entry step endpoint.
   */
  async handleEntryStep(req: Request, res: Response): Promise<void> {
    const body = req.body as {
      sessionId?: string;
      courseId?: string;
      expressionLatex?: string;
      selectionPath?: string;
      operatorIndex?: number;
      userRole?: string;
      userId?: string;
      preferredPrimitiveId?: string;
    };

    console.log("[handleEntryStep]: start");
    console.log("[handleEntryStep]: body", body);

    if (!body) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    if (!body.sessionId || !body.courseId || !body.expressionLatex) {
      res.status(400).json({ error: "Missing required fields" });
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

      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[ApiController] Entry step failed: ${message}`);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * POST /api/undo-step - Undo step endpoint.
   */
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
  async handleHintRequest(req: Request, res: Response): Promise<void> {
    // TODO: Implement hint logic
    res.status(200).json({
      hintText: "Try simplifying the expression",
      suggestedPrimitiveId: null,
    });
  }
}
