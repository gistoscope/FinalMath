/**
 * Debug Controller
 *
 * Handles all debug endpoints used by viewer/debug-tool.html (Dev Tool).
 *
 * WARNING: These endpoints are DEBUG/TOOLS ONLY.
 * They MUST NOT be called from the student-facing Viewer/Adapter or main UI.
 */

import { Request, Response } from "express";
import { autoInjectable } from "tsyringe";
import { Controller } from "../../core/decorator/controller.decorator";
import { UseDTO } from "../../core/decorator/dto.decorator";
import { GET, POST } from "../../core/decorator/routes.decorator";

import { DebugService } from "./debug.service";
import {
  AstDebugDto,
  AstResolvePathDto,
  InstrumentDto,
  MapMasterDebugDto,
  MapMasterGlobalMapDto,
  PrimitiveMapDebugDto,
  StepDebugDto,
  ValidateOperatorDto,
} from "./dtos";

@autoInjectable()
@Controller("/api")
export class DebugController {
  constructor(private readonly debugService: DebugService) {}

  /**
   * POST /api/ast-debug
   *
   * Parse LaTeX and return AST structure.
   * DEBUG/TOOLS ONLY.
   */
  @POST("/ast-debug")
  @UseDTO(AstDebugDto)
  async astDebug(req: Request, res: Response) {
    const dto: AstDebugDto = req.body;
    const result = (await this.debugService.handleAstDebug(dto)) as any;

    const statusCode =
      result.type === "ok" ? 200 : result.type === "error" ? 400 : 500;
    return res.status(statusCode).json(result);
  }

  /**
   * POST /api/mapmaster-debug
   *
   * Run MapMaster debug pipeline.
   * DEBUG/TOOLS ONLY.
   */
  @POST("/mapmaster-debug")
  @UseDTO(MapMasterDebugDto)
  async mapMasterDebug(req: Request, res: Response) {
    const dto: MapMasterDebugDto = req.body;
    const result = (await this.debugService.handleMapMasterDebug(dto)) as any;

    const statusCode = result.type === "ok" ? 200 : 500;
    return res.status(statusCode).json(result);
  }

  /**
   * POST /api/mapmaster-global-map
   *
   * Generate global map for expression.
   * DEBUG/TOOLS ONLY.
   */
  @POST("/mapmaster-global-map")
  @UseDTO(MapMasterGlobalMapDto)
  async mapMasterGlobalMap(req: Request, res: Response) {
    const dto: MapMasterGlobalMapDto = req.body;
    const result = (await this.debugService.handleMapMasterGlobalMap(
      dto
    )) as any;

    return res.status(200).json(result);
  }

  /**
   * POST /api/step-debug
   *
   * Run StepMaster debug pipeline.
   * DEBUG/TOOLS ONLY.
   */
  @POST("/step-debug")
  @UseDTO(StepDebugDto)
  async stepDebug(req: Request, res: Response) {
    const dto: StepDebugDto = req.body;
    const result = (await this.debugService.handleStepDebug(dto)) as any;

    const statusCode = result.type === "ok" ? 200 : 500;
    return res.status(statusCode).json(result);
  }

  /**
   * POST /api/primitive-map-debug
   *
   * Run PrimitiveMaster debug.
   * DEBUG/TOOLS ONLY.
   */
  @POST("/primitive-map-debug")
  @UseDTO(PrimitiveMapDebugDto)
  async primitiveMapDebug(req: Request, res: Response) {
    const dto: PrimitiveMapDebugDto = req.body;
    const result = await this.debugService.handlePrimitiveMapDebug(dto);

    return res.status(200).json(result);
  }

  /**
   * POST /api/instrument
   *
   * Instrument LaTeX with data-ast-id wrappers.
   * This is the AUTHORITATIVE source of truth for AST node IDs.
   */
  @POST("/instrument")
  @UseDTO(InstrumentDto)
  async instrument(req: Request, res: Response) {
    const dto: InstrumentDto = req.body;
    const result = (await this.debugService.handleInstrument(dto)) as any;

    const statusCode = result.success ? 200 : 400;
    return res.status(statusCode).json(result);
  }

  /**
   * POST /api/v1/validate-operator
   *
   * Validate operator context for smart selection.
   */
  @POST("/v1/validate-operator")
  @UseDTO(ValidateOperatorDto)
  async validateOperator(req: Request, res: Response) {
    const dto: ValidateOperatorDto = req.body;
    const result = (await this.debugService.handleValidateOperator(dto)) as any;

    return res.status(200).json(result);
  }
}

/**
 * Debug Trace Controller
 *
 * Handles TraceHub and StepSnapshot debug endpoints.
 */
@autoInjectable()
@Controller("/debug")
export class DebugTraceController {
  constructor(private readonly debugService: DebugService) {}

  // ============================================================
  // Step Snapshot Endpoints
  // ============================================================

  /**
   * GET /debug/step-snapshot/latest
   */
  @GET("/step-snapshot/latest")
  async getLatestStepSnapshot(_req: Request, res: Response) {
    const snapshot = this.debugService.getLatestStepSnapshot() as any;

    if (snapshot.error) {
      return res.status(404).json(snapshot);
    }
    return res.status(200).json(snapshot);
  }

  /**
   * GET /debug/step-snapshot/session
   */
  @GET("/step-snapshot/session")
  async getSessionStepSnapshots(_req: Request, res: Response) {
    const snapshots = this.debugService.getSessionStepSnapshots() as any;
    return res.status(200).json(snapshots);
  }

  /**
   * POST /debug/step-snapshot/reset
   */
  @POST("/step-snapshot/reset")
  async resetStepSnapshotSession(_req: Request, res: Response) {
    const result = this.debugService.resetStepSnapshotSession() as any;
    return res.status(200).json(result);
  }

  // ============================================================
  // TraceHub Endpoints
  // ============================================================

  /**
   * GET /debug/trace/latest
   */
  @GET("/trace/latest")
  async getLatestTrace(_req: Request, res: Response) {
    const result = (await this.debugService.getLatestTrace()) as any;
    return res.status(200).json(result);
  }

  /**
   * GET /debug/trace/download
   */
  @GET("/trace/download")
  async downloadTrace(_req: Request, res: Response) {
    const { jsonl, filename } =
      (await this.debugService.downloadTrace()) as any;

    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(jsonl);
  }

  /**
   * POST /debug/trace/reset
   */
  @POST("/trace/reset")
  async resetTrace(_req: Request, res: Response) {
    const result = this.debugService.resetTrace() as any;
    return res.status(200).json(result);
  }

  // ============================================================
  // AST Path Resolver Debug Endpoint
  // ============================================================

  /**
   * POST /debug/ast/resolve-path
   */
  @POST("/ast/resolve-path")
  @UseDTO(AstResolvePathDto)
  async astResolvePath(req: Request, res: Response) {
    const dto: AstResolvePathDto = req.body;
    const result = (await this.debugService.handleAstResolvePath(dto)) as any;

    const statusCode = result.ok ? 200 : 400;
    return res.status(statusCode).json(result);
  }
}
