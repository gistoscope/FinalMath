/**
 * Health Controller Tests
 */

import { Request, Response } from "express";
import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let controller: HealthController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    // Manually create controller (no dependencies)
    controller = new HealthController();

    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe("healthCheck", () => {
    it("should return 200 with UP message", async () => {
      await controller.healthCheck(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "UP" });
    });
  });

  describe("root", () => {
    it("should return 200 with welcome message", async () => {
      await controller.root(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "You are good to go",
      });
    });
  });
});
