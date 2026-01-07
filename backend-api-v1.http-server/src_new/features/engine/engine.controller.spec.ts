/**
 * Engine Controller Tests
 */

import { Request, Response } from "express";
import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EngineController } from "./engine.controller";
import { EngineService } from "./engine.service";

describe("EngineController", () => {
  let controller: EngineController;
  let mockEngineService: Partial<EngineService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    // Create mock EngineService
    mockEngineService = {
      handleEntryStep: vi
        .fn()
        .mockResolvedValue({ ok: false, errorCode: "no-candidates" }),
      handleUndoStep: vi
        .fn()
        .mockResolvedValue({ ok: false, errorCode: "no-history-to-undo" }),
      handleHintRequest: vi.fn().mockResolvedValue({ hint: "Test hint" }),
    };

    // Manually create controller with mock service
    controller = new EngineController(mockEngineService as EngineService);

    mockReq = {
      body: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe("entryStep", () => {
    it("should call handleEntryStep and return 200", async () => {
      mockReq.body = {
        expressionLatex: "1+2",
        sessionId: "test-session",
      };

      await controller.entryStep(mockReq as Request, mockRes as Response);

      expect(mockEngineService.handleEntryStep).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe("legacyStep", () => {
    it("should call handleEntryStep for legacy endpoint", async () => {
      mockReq.body = {
        expressionLatex: "3+4",
      };

      await controller.legacyEntryStep(mockReq as Request, mockRes as Response);

      expect(mockEngineService.handleEntryStep).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe("undoStep", () => {
    it("should call handleUndoStep and return result", async () => {
      mockReq.body = {
        sessionId: `undo-${Date.now()}`,
      };

      await controller.undoStep(mockReq as Request, mockRes as Response);

      expect(mockEngineService.handleUndoStep).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe("hintRequest", () => {
    it("should call handleHintRequest and return result", async () => {
      mockReq.body = {
        expressionLatex: "1+2",
        sessionId: "test-session",
        courseId: "default",
      };

      await controller.hintRequest(mockReq as Request, mockRes as Response);

      expect(mockEngineService.handleHintRequest).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});
