/**
 * Reporting Service Tests
 */

import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnauthorizedException } from "../../core/errors";
import { Token } from "../auth/token.helpers";
import { ReportingService } from "./reporting.service";

// Mock the core stubs
vi.mock("../../core/stubs", () => ({
  authService: {
    validateToken: vi.fn(),
  },
  SessionService: {
    findAllSessionsByUserId: vi.fn(),
  },
}));

describe("ReportingService", () => {
  let reportingService: ReportingService;

  beforeEach(() => {
    reportingService = new ReportingService(new Token());
    vi.resetAllMocks();

    // Default mock behavior for auth (student role)
    // vi.mocked(authService.validateToken).mockImplementation((token) => {
    //   if (!token) return null;
    //   return { userId: "stub-user", username: "stub-user", role: "student" };
    // });
  });

  describe("getStudentProgress", () => {
    it("should throw UnauthorizedException when no token provided", async () => {
      await expect(
        reportingService.getStudentProgress("student-1", undefined)
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException for invalid token", async () => {
      await expect(
        reportingService.getStudentProgress("student-1", "")
      ).rejects.toThrow(UnauthorizedException);
    });

    // it("should throw ForbiddenException for non-teacher role", async () => {
    //   // The stub auth service returns "student" role for any valid token
    //   await expect(
    //     reportingService.getStudentProgress("student-1", "valid-token")
    //   ).rejects.toThrow(ForbiddenException);
    // });

    // Note: To test successful case, we would need to mock authService
    // to return a teacher role
  });
});
