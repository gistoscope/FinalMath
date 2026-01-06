/**
 * Reporting Service Tests
 */

import "reflect-metadata";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";
import { ForbiddenException, UnauthorizedException } from "../../core/errors";
import { ReportingService } from "./reporting.service";

describe("ReportingService", () => {
  let reportingService: ReportingService;

  beforeEach(() => {
    container.clearInstances();
    reportingService = container.resolve(ReportingService);
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

    it("should throw ForbiddenException for non-teacher role", async () => {
      // The stub auth service returns "student" role for any valid token
      await expect(
        reportingService.getStudentProgress("student-1", "valid-token")
      ).rejects.toThrow(ForbiddenException);
    });

    // Note: To test successful case, we would need to mock authService
    // to return a teacher role
  });
});
