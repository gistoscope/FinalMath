/**
 * Orchestrator Controller Tests
 */

import { Request, Response } from "express";
import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrchestratorController } from "./orchestrator.controller";
import { OrchestratorService } from "./orchestrator.service";

describe("OrchestratorController", () => {
  let controller: OrchestratorController;
  let mockOrchestratorService: Partial<OrchestratorService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    // Create mock service
    mockOrchestratorService = {
      handleStepV5: vi.fn().mockResolvedValue({
        status: "no-candidates",
        engineResult: null,
        history: { entries: [] },
      }),
    };

    // Manually create controller with mock service
    controller = new OrchestratorController(
      mockOrchestratorService as OrchestratorService
    );

    mockReq = { body: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe("step", () => {
    it("should handle step request and return 200", async () => {
      mockReq.body = {
        expressionLatex: "1+2",
        sessionId: "test-session",
      };

      await controller.step(mockReq as Request, mockRes as Response);

      expect(mockOrchestratorService.handleStepV5).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it("should handle step request with all fields", async () => {
      mockReq.body = {
        expressionLatex: "3+4",
        sessionId: "test-session",
        courseId: "math-101",
        selectionPath: "root",
        operatorIndex: 0,
      };

      await controller.step(mockReq as Request, mockRes as Response);

      expect(mockOrchestratorService.handleStepV5).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});
