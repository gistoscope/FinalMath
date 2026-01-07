/**
 * Reporting Controller Tests
 */

import { Request, Response } from "express";
import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenException, UnauthorizedException } from "../../core/errors";
import { ReportingController } from "./reporting.controller";
import { ReportingService } from "./reporting.service";

describe("ReportingController", () => {
  let controller: ReportingController;
  let mockReportingService: Partial<ReportingService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReportingService = {
      getStudentProgress: vi.fn(),
    };

    // Manually create controller with mock service
    controller = new ReportingController(
      mockReportingService as ReportingService
    );

    mockReq = {
      query: {},
      headers: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe("getStudentProgress", () => {
    it("should return 400 when userId query param is missing", async () => {
      mockReq.query = {};

      await controller.getStudentProgress(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it("should return 401 when service throws UnauthorizedException", async () => {
      mockReq.query = { userId: "student-1" };
      mockReq.headers = {};
      (mockReportingService.getStudentProgress as any).mockRejectedValue(
        new UnauthorizedException("Unauthorized")
      );

      await controller.getStudentProgress(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it("should return 403 when service throws ForbiddenException", async () => {
      mockReq.query = { userId: "student-1" };
      mockReq.headers = { authorization: "Bearer valid-token" };
      (mockReportingService.getStudentProgress as any).mockRejectedValue(
        new ForbiddenException("Forbidden")
      );

      await controller.getStudentProgress(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it("should return 200 with report on success", async () => {
      mockReq.query = { userId: "student-1" };
      mockReq.headers = { authorization: "Bearer valid-token" };
      (mockReportingService.getStudentProgress as any).mockResolvedValue({
        studentId: "student-1",
        totalSessions: 5,
        totalErrors: 2,
        sessions: [],
      });

      await controller.getStudentProgress(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});
