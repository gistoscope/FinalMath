/**
 * DebugController Class
 *
 * Handles debug and diagnostic endpoints.
 */

import { AstParser } from "@/core/index.js";
import type { Request, Response } from "express";
import { injectable } from "tsyringe";
import { Controller } from "../core/decorator/controller.decorator";
import { GET, POST } from "../core/decorator/routes.decorator";

@injectable()
@Controller("/debug")
export class DebugController {
  constructor(private readonly astParser: AstParser) {}

  /**
   * POST /debug/ast - Parse and return AST.
   */
  @POST("/ast")
  async handleAstDebug(req: Request, res: Response): Promise<void> {
    const body = req.body as { latex?: string };

    if (!body?.latex) {
      res.status(400).json({ error: "Missing latex field" });
      return;
    }

    const ast = this.astParser.parse(body.latex);

    res.status(200).json({
      ok: !!ast,
      latex: body.latex,
      ast,
    });
  }

  /**
   * POST /debug/mapmaster - Debug MapMaster output.
   */
  @POST("/mapmaster")
  async handleMapMasterDebug(_req: Request, res: Response): Promise<void> {
    // TODO: Implement MapMaster debug
    res.status(200).json({
      ok: true,
      message: "MapMaster debug not yet implemented",
    });
  }

  /**
   * POST /debug/step - Debug step execution.
   */
  @POST("/step")
  async handleStepDebug(_req: Request, res: Response): Promise<void> {
    // TODO: Implement step debug
    res.status(200).json({
      ok: true,
      message: "Step debug not yet implemented",
    });
  }

  /**
   * GET /debug/trace - Get trace data.
   */
  @GET("/trace")
  async handleTraceDebug(_req: Request, res: Response): Promise<void> {
    // TODO: Implement trace retrieval
    res.status(200).json({
      ok: true,
      traces: [],
    });
  }
}
