/**
 * Debug Service
 *
 * Handles debugging and development tools endpoints.
 * Uses stub implementations for development.
 */

import type { Logger } from "pino";
import { inject, injectable } from "tsyringe";

import {
  StepSnapshotStore,
  TraceHub,
  instrumentLatex,
  parseExpression,
  type ExpressionAstNode,
} from "../../core/stubs";

import { HANDLER_DEPS_TOKEN, type HandlerDeps } from "../../core/types";
import {
  AstDebugDto,
  AstPathDebugDto,
  InstrumentDto,
  MapMasterDebugDto,
  OperatorValidationDto,
  PrimitiveMapDebugDto,
  StepMasterDebugDto,
} from "./dtos";

// Response types
export interface AstDebugResponse {
  ok: boolean;
  ast?: ExpressionAstNode;
  error?: string;
}

export interface MapMasterDebugResponse {
  ok: boolean;
  candidates?: any[];
  error?: string;
}

export interface StepMasterDebugResponse {
  ok: boolean;
  result?: any;
  error?: string;
}

export interface InstrumentResponse {
  ok: boolean;
  instrumentedLatex?: string;
  error?: string;
}

@injectable()
export class DebugService {
  private log: (message: string) => void;
  private logger?: Logger;

  constructor(@inject(HANDLER_DEPS_TOKEN) private deps: HandlerDeps) {
    this.log = deps.log ?? (() => {});
    this.logger = deps.logger;
  }

  /**
   * Parse LaTeX and return AST
   */
  async handleAstDebug(dto: AstDebugDto): Promise<AstDebugResponse> {
    try {
      const ast = parseExpression(dto.latex);
      return { ok: true, ast };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Parse error";
      return { ok: false, error: message };
    }
  }

  /**
   * Run MapMaster debug
   */
  async handleMapMasterDebug(
    dto: MapMasterDebugDto
  ): Promise<MapMasterDebugResponse> {
    try {
      // Stub implementation
      this.logInfo(`[DebugService] MapMaster debug for: ${dto.latex}`);
      return {
        ok: true,
        candidates: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Debug error";
      return { ok: false, error: message };
    }
  }

  /**
   * Run StepMaster debug
   */
  async handleStepMasterDebug(
    dto: StepMasterDebugDto
  ): Promise<StepMasterDebugResponse> {
    try {
      // Stub implementation
      this.logInfo(`[DebugService] StepMaster debug for: ${dto.latex}`);
      return {
        ok: true,
        result: { message: "StepMaster debug stub" },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Debug error";
      return { ok: false, error: message };
    }
  }

  /**
   * Instrument LaTeX with stable IDs
   */
  async handleInstrument(dto: InstrumentDto): Promise<InstrumentResponse> {
    try {
      const instrumentedLatex = instrumentLatex(dto.latex);
      return { ok: true, instrumentedLatex };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Instrument error";
      return { ok: false, error: message };
    }
  }

  /**
   * Get AST path information
   */
  async handleAstPathDebug(dto: AstPathDebugDto): Promise<any> {
    try {
      const ast = parseExpression(dto.latex);
      return {
        ok: true,
        ast,
        path: dto.path,
        node: null, // Stub
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Path debug error";
      return { ok: false, error: message };
    }
  }

  /**
   * Validate operator context
   */
  async handleOperatorValidation(dto: OperatorValidationDto): Promise<any> {
    try {
      this.logInfo(`[DebugService] Operator validation for: ${dto.latex}`);
      return {
        ok: true,
        validationType: "direct",
        validationDetail: null,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Validation error";
      return { ok: false, error: message };
    }
  }

  /**
   * Get primitive map debug info
   */
  async handlePrimitiveMapDebug(dto: PrimitiveMapDebugDto): Promise<any> {
    try {
      this.logInfo(`[DebugService] Primitive map debug for: ${dto.latex}`);
      return {
        ok: true,
        primitives: [],
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Primitive map error";
      return { ok: false, error: message };
    }
  }

  /**
   * Get step snapshot
   */
  async handleStepSnapshot(): Promise<any> {
    return (
      StepSnapshotStore.getLatest() || { message: "No snapshot available" }
    );
  }

  /**
   * Get trace hub data
   */
  async handleTraceHub(): Promise<any> {
    return {
      traces: TraceHub.getAll(),
    };
  }

  /**
   * Clear trace hub
   */
  async handleClearTraceHub(): Promise<any> {
    TraceHub.clear();
    return { ok: true };
  }

  private logInfo(msg: string) {
    if (this.logger) this.logger.info(msg);
    else this.log(msg);
  }
}
