/**
 * Reporting Controller
 *
 * Handles reporting and analytics endpoints.
 */

import { Request, Response } from "express";
import { autoInjectable } from "tsyringe";

import { Controller } from "../../core/decorator/controller.decorator";
import { GET } from "../../core/decorator/routes.decorator";
import { HttpException } from "../../core/errors";

import { ReportingService } from "./reporting.service";

@autoInjectable()
@Controller("/api/teacher")
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  /**
   * GET /api/teacher/student-progress
   *
   * Get progress report for a specific student.
   * Requires teacher role.
   *
   * Query params:
   * - userId: string (required) - The student ID to get progress for
   *
   * Headers:
   * - Authorization: Bearer <token> (required)
   */
  @GET("/student-progress")
  async getStudentProgress(req: Request, res: Response) {
    const studentId = req.query.userId as string;

    if (!studentId) {
      return res.status(400).json({ error: "Missing userId query parameter" });
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    try {
      const report = await this.reportingService.getStudentProgress(
        studentId,
        token
      );
      return res.status(200).json(report);
    } catch (error) {
      if (error instanceof HttpException) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      throw error;
    }
  }
}
