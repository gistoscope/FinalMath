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
  let mockStepService: any; // Use any to mock non-existent methods
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    // Mock StepService with the methods the controller tries to call
    mockStepService = {
      signIn: vi.fn().mockResolvedValue("mock-token"),
      signUp: vi.fn().mockResolvedValue(null),
    };

    // Manually create controller
    controller = new StepController(mockStepService as StepService);

    mockReq = { body: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe("entry", () => {
    it("should call signIn and return token", async () => {
      mockReq.body = { expressionLatex: "1+2" };

      await controller.entry(mockReq as Request, mockRes as Response);

      expect(mockStepService.signIn).toHaveBeenCalledWith(mockReq.body);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { token: "mock-token" },
        })
      );
    });
  });

  describe("undo", () => {
    it("should call signUp and return success", async () => {
      mockReq.body = { sessionId: "sess-1" };

      await controller.undo(mockReq as Request, mockRes as Response);

      expect(mockStepService.signUp).toHaveBeenCalledWith(mockReq.body);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});
