/**
 * DebugRouter.ts
 *
 * Debug and development tool route handlers.
 * These endpoints are for development/debugging only and should NOT be
 * called from student-facing UI.
 */

import type { IncomingMessage, ServerResponse } from "node:http";

import { StepSnapshotStore } from "../../debug/StepSnapshotStore.js";
import { HttpUtils } from "../utils/HttpUtils.js";
import { BaseRouter, type RouterDeps } from "./BaseRouter.js";

/**
 * Router for debug endpoints.
 * Handles step snapshots, trace hub, AST debugging, and other dev tools.
 */
export class DebugRouter extends BaseRouter {
  constructor(deps: RouterDeps) {
    super(deps);
  }

  protected registerRoutes(): void {
    // Step snapshot endpoints
    this.get(
      "/debug/step-snapshot/latest",
      this.handleSnapshotLatest.bind(this),
    );
    this.get(
      "/debug/step-snapshot/session",
      this.handleSnapshotSession.bind(this),
    );
    this.post(
      "/debug/step-snapshot/reset",
      this.handleSnapshotReset.bind(this),
    );

    // TraceHub endpoints
    this.get("/debug/trace/latest", this.handleTraceLatest.bind(this));
    this.get("/debug/trace/download", this.handleTraceDownload.bind(this));
    this.post("/debug/trace/reset", this.handleTraceReset.bind(this));

    // AST debug endpoints
    this.post("/debug/ast/resolve-path", this.handleAstResolvePath.bind(this));

    // API debug endpoints (dev tools only)
    this.post("/api/ast-debug", this.handleAstDebug.bind(this));
    this.post("/api/mapmaster-debug", this.handleMapMasterDebug.bind(this));
    this.post(
      "/api/mapmaster-global-map",
      this.handleMapMasterGlobalMap.bind(this),
    );
    this.post("/api/step-debug", this.handleStepDebug.bind(this));
    this.post(
      "/api/primitive-map-debug",
      this.handlePrimitiveMapDebug.bind(this),
    );
  }

  // ============================================================
  // STEP SNAPSHOT ENDPOINTS
  // ============================================================

  /**
   * GET /debug/step-snapshot/latest - Get latest step snapshot.
   */
  private async handleSnapshotLatest(
    _req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const snapshot = StepSnapshotStore.getLatest();
    if (snapshot) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(snapshot));
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No step snapshot available" }));
    }
  }

  /**
   * GET /debug/step-snapshot/session - Get session snapshots.
   */
  private async handleSnapshotSession(
    _req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const snapshots = StepSnapshotStore.getSessionSnapshots();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(snapshots));
  }

  /**
   * POST /debug/step-snapshot/reset - Reset session snapshots.
   */
  private async handleSnapshotReset(
    _req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    StepSnapshotStore.resetSession();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        message: "Step snapshot session reset",
      }),
    );
  }

  // ============================================================
  // TRACEHUB ENDPOINTS
  // ============================================================

  /**
   * GET /debug/trace/latest - Get latest trace info.
   */
  private async handleTraceLatest(
    _req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const { TraceHub } = await import("../../debug/TraceHub.js");
    const count = TraceHub.count();
    const lastTraceId = TraceHub.getLastTraceId();
    const lastStepId = TraceHub.getLastStepId();
    const lastNEvents = TraceHub.getLastN(20);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        count,
        lastTraceId,
        lastStepId,
        lastNEvents,
      }),
    );
  }

  /**
   * GET /debug/trace/download - Download trace as JSONL.
   */
  private async handleTraceDownload(
    _req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const { TraceHub } = await import("../../debug/TraceHub.js");
    const jsonl = TraceHub.toJsonl();
    const filename = `tracehub-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`;

    res.writeHead(200, {
      "Content-Type": "application/x-ndjson",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
    res.end(jsonl);
  }

  /**
   * POST /debug/trace/reset - Reset trace buffer.
   */
  private async handleTraceReset(
    _req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const { TraceHub } = await import("../../debug/TraceHub.js");
    TraceHub.reset();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", message: "TraceHub buffer reset" }));
  }

  // ============================================================
  // AST DEBUG ENDPOINTS
  // ============================================================

  /**
   * POST /debug/ast/resolve-path - Resolve AST path.
   */
  private async handleAstResolvePath(
    _req: IncomingMessage,
    res: ServerResponse,
    body?: unknown,
  ): Promise<void> {
    const parsedBody = body as {
      latex?: string;
      selectionPath?: string;
    };

    if (!parsedBody?.latex || typeof parsedBody.latex !== "string") {
      HttpUtils.sendJson(res, 400, {
        ok: false,
        error: "invalid-request",
        message: "Missing or invalid 'latex' field",
      });
      return;
    }

    if (
      !parsedBody.selectionPath ||
      typeof parsedBody.selectionPath !== "string"
    ) {
      HttpUtils.sendJson(res, 400, {
        ok: false,
        error: "invalid-request",
        message: "Missing or invalid 'selectionPath' field",
      });
      return;
    }

    const { parseExpression, getNodeAt } =
      await import("../../mapmaster/ast.js");

    let ast;
    try {
      ast = parseExpression(parsedBody.latex);
    } catch (parseError) {
      HttpUtils.sendJson(res, 200, {
        ok: false,
        error: "parse-failed",
        message: `Failed to parse LaTeX: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        latex: parsedBody.latex,
      });
      return;
    }

    if (!ast) {
      HttpUtils.sendJson(res, 200, {
        ok: false,
        error: "parse-failed",
        message: "AST parsing returned null",
        latex: parsedBody.latex,
      });
      return;
    }

    const resolvedNode = getNodeAt(ast, parsedBody.selectionPath);

    if (!resolvedNode) {
      HttpUtils.sendJson(res, 200, {
        ok: false,
        error: "path-not-found",
        message: `Path '${parsedBody.selectionPath}' not found in AST`,
        latex: parsedBody.latex,
        selectionPath: parsedBody.selectionPath,
        astRootType: ast.type,
      });
      return;
    }

    const nodeValue =
      (resolvedNode as { value?: string | number }).value ?? null;
    const latexFragment = (resolvedNode as { latex?: string }).latex ?? null;

    HttpUtils.sendJson(res, 200, {
      ok: true,
      selectionPath: parsedBody.selectionPath,
      resolvedType: resolvedNode.type,
      resolvedKind: resolvedNode.type,
      value: nodeValue,
      latexFragment:
        latexFragment || (nodeValue !== null ? String(nodeValue) : null),
      nodeKeys: Object.keys(resolvedNode),
    });
  }

  // ============================================================
  // API DEBUG ENDPOINTS (DEV TOOLS ONLY)
  // ============================================================

  /**
   * POST /api/ast-debug - AST debug endpoint.
   */
  private async handleAstDebug(
    req: IncomingMessage,
    res: ServerResponse,
    body?: unknown,
  ): Promise<void> {
    const { handlePostAstDebug } =
      await import("../../server/HandlerPostAstDebug.js");
    await handlePostAstDebug(req, res, body);
  }

  /**
   * POST /api/mapmaster-debug - MapMaster debug endpoint.
   */
  private async handleMapMasterDebug(
    req: IncomingMessage,
    res: ServerResponse,
    body?: unknown,
  ): Promise<void> {
    const { handlePostMapMasterDebug } =
      await import("../../server/HandlerPostMapMasterDebug.js");
    await handlePostMapMasterDebug(req, res, body);
  }

  /**
   * POST /api/mapmaster-global-map - MapMaster global map debug endpoint.
   */
  private async handleMapMasterGlobalMap(
    req: IncomingMessage,
    res: ServerResponse,
    body?: unknown,
  ): Promise<void> {
    const { handlePostMapMasterGlobalMap } =
      await import("../../server/HandlerPostMapMasterGlobalMap.js");
    await handlePostMapMasterGlobalMap(req, res, body);
  }

  /**
   * POST /api/step-debug - Step debug endpoint.
   */
  private async handleStepDebug(
    req: IncomingMessage,
    res: ServerResponse,
    body?: unknown,
  ): Promise<void> {
    const { handlePostStepDebug } =
      await import("../../server/HandlerPostStepDebug.js");
    await handlePostStepDebug(req, res, body);
  }

  /**
   * POST /api/primitive-map-debug - Primitive map debug endpoint.
   */
  private async handlePrimitiveMapDebug(
    req: IncomingMessage,
    res: ServerResponse,
    body?: unknown,
  ): Promise<void> {
    const { handlePostPrimitiveMapDebug } =
      await import("../../server/HandlerPostPrimitiveMapDebug.js");
    await handlePostPrimitiveMapDebug(req, res, body);
  }
}
