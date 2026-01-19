/**
 * DebugController Class
 *
 * Handles debug and diagnostic endpoints.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { injectable } from "tsyringe";
import { BaseController } from "./BaseController.js";

@injectable()
export class DebugController extends BaseController {
  /**
   * POST /debug/ast - Parse and return AST.
   */
  async handleAstDebug(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const body = await this.parseBody<{ latex?: string }>(req);

    if (!body?.latex) {
      this.sendError(res, 400, "Missing latex field");
      return;
    }

    // Import AST parser
    const { AstParser } = await import("../../core/ast/AstParser.js");
    const ast = AstParser.parse(body.latex);

    this.sendJson(res, 200, {
      ok: !!ast,
      latex: body.latex,
      ast,
    });
  }

  /**
   * POST /debug/mapmaster - Debug MapMaster output.
   */
  async handleMapMasterDebug(
    _req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    // TODO: Implement MapMaster debug
    this.sendJson(res, 200, {
      ok: true,
      message: "MapMaster debug not yet implemented",
    });
  }

  /**
   * POST /debug/step - Debug step execution.
   */
  async handleStepDebug(
    _req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    // TODO: Implement step debug
    this.sendJson(res, 200, {
      ok: true,
      message: "Step debug not yet implemented",
    });
  }

  /**
   * GET /debug/trace - Get trace data.
   */
  async handleTraceDebug(
    _req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    // TODO: Implement trace retrieval
    this.sendJson(res, 200, {
      ok: true,
      traces: [],
    });
  }
}
