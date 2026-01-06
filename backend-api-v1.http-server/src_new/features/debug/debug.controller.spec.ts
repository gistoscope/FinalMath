/**
 * Debug Controller Tests
 */

import { Request, Response } from "express";
import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DebugController, DebugTraceController } from "./debug.controller";
import { DebugService } from "./debug.service";

describe("DebugController", () => {
  let controller: DebugController;
  let mockDebugService: Partial<DebugService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    // Create mock DebugService
    mockDebugService = {
      handleAstDebug: vi.fn().mockResolvedValue({ type: "ok", ast: {} }),
      handleMapMasterDebug: vi
        .fn()
        .mockResolvedValue({ type: "ok", candidates: [] }),
      handleMapMasterGlobalMap: vi.fn().mockResolvedValue({ ok: true }),
      handleStepDebug: vi.fn().mockResolvedValue({ type: "ok" }),
      handlePrimitiveMapDebug: vi
        .fn()
        .mockResolvedValue({ ok: true, primitives: [] }),
      handleInstrument: vi
        .fn()
        .mockResolvedValue({ success: true, instrumentedLatex: "1+2" }),
      handleValidateOperator: vi.fn().mockResolvedValue({ ok: true }),
    };

    // Manually create controller with mock service
    controller = new DebugController(mockDebugService as DebugService);

    mockReq = { body: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe("astDebug", () => {
    it("should parse AST and return result", async () => {
      mockReq.body = { latex: "1+2" };

      await controller.astDebug(mockReq as Request, mockRes as Response);

      expect(mockDebugService.handleAstDebug).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe("mapMasterDebug", () => {
    it("should return map master debug result", async () => {
      mockReq.body = { latex: "1+2" };

      await controller.mapMasterDebug(mockReq as Request, mockRes as Response);

      expect(mockDebugService.handleMapMasterDebug).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe("stepDebug", () => {
    it("should return step debug result", async () => {
      mockReq.body = { latex: "1+2" };

      await controller.stepDebug(mockReq as Request, mockRes as Response);

      expect(mockDebugService.handleStepDebug).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe("instrument", () => {
    it("should return instrumented latex", async () => {
      mockReq.body = { latex: "\\frac{1}{2}" };

      await controller.instrument(mockReq as Request, mockRes as Response);

      expect(mockDebugService.handleInstrument).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe("primitiveMapDebug", () => {
    it("should return primitive map debug result", async () => {
      mockReq.body = { latex: "1+2" };

      await controller.primitiveMapDebug(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockDebugService.handlePrimitiveMapDebug).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});

describe("DebugTraceController", () => {
  let controller: DebugTraceController;
  let mockDebugService: Partial<DebugService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    // Create mock DebugService
    mockDebugService = {
      getLatestStepSnapshot: vi.fn().mockReturnValue({ snapshot: {} }),
      getSessionStepSnapshots: vi.fn().mockReturnValue({ snapshots: [] }),
      resetStepSnapshotSession: vi.fn().mockReturnValue({ ok: true }),
      getLatestTrace: vi.fn().mockResolvedValue({ trace: [] }),
      downloadTrace: vi
        .fn()
        .mockResolvedValue({ jsonl: "", filename: "trace.jsonl" }),
      resetTrace: vi.fn().mockReturnValue({ ok: true }),
      handleAstResolvePath: vi.fn().mockResolvedValue({ ok: true }),
    };

    // Manually create controller with mock service
    controller = new DebugTraceController(mockDebugService as DebugService);

    mockReq = { body: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      send: vi.fn().mockReturnThis(),
    };
  });

  describe("getLatestStepSnapshot", () => {
    it("should return step snapshot", async () => {
      await controller.getLatestStepSnapshot(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockDebugService.getLatestStepSnapshot).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getSessionStepSnapshots", () => {
    it("should return session snapshots", async () => {
      await controller.getSessionStepSnapshots(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockDebugService.getSessionStepSnapshots).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe("resetStepSnapshotSession", () => {
    it("should reset and return ok", async () => {
      await controller.resetStepSnapshotSession(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockDebugService.resetStepSnapshotSession).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getLatestTrace", () => {
    it("should return trace hub data", async () => {
      await controller.getLatestTrace(mockReq as Request, mockRes as Response);

      expect(mockDebugService.getLatestTrace).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe("resetTrace", () => {
    it("should reset trace hub and return ok", async () => {
      await controller.resetTrace(mockReq as Request, mockRes as Response);

      expect(mockDebugService.resetTrace).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});
