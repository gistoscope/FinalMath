/**
 * Step Controller Tests
 */

import { Request, Response } from "express";
import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StepController } from "./step.controller";
import { StepService } from "./step.service";

describe("StepController", () => {
  let controller: StepController;
  let mockStepService: Partial<StepService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockStepService = {
      handleEntry: vi
        .fn()
        .mockResolvedValue({ ok: true, newExpressionLatex: "3" }),
      handleUndo: vi
        .fn()
        .mockResolvedValue({ ok: true, newExpressionLatex: "1" }),
    };

    controller = new StepController(mockStepService as StepService);

    mockReq = { body: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe("entry", () => {
    it("should call handleEntry and return result", async () => {
      mockReq.body = { expressionLatex: "1+2" };

      await controller.entry(mockReq as Request, mockRes as Response);

      expect(mockStepService.handleEntry).toHaveBeenCalledWith(mockReq.body);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe("undo", () => {
    it("should call handleUndo and return result", async () => {
      mockReq.body = { sessionId: "sess-1" };

      await controller.undo(mockReq as Request, mockRes as Response);

      expect(mockStepService.handleUndo).toHaveBeenCalledWith(mockReq.body);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});
