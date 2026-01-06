/**
 * Reporting Service
 *
 * Handles reporting and analytics operations.
 * Uses stub implementations for development.
 */

import { injectable } from "tsyringe";

import { ForbiddenException, UnauthorizedException } from "../../core/errors";
import { authService, SessionService } from "../../core/stubs";

export interface StudentProgressReport {
  studentId: string;
  totalSessions: number;
  totalErrors: number;
  sessions: SessionReport[];
}

export interface SessionReport {
  sessionId: string;
  createdAt: string | number;
  stepCount: number;
  errorCount: number;
  lastExpression: string | null | undefined;
}

@injectable()
export class ReportingService {
  constructor() {}

  /**
   * Get student progress report
   */
  async getStudentProgress(
    studentId: string,
    authToken?: string
  ): Promise<StudentProgressReport> {
    // Validate token
    if (!authToken) {
      throw new UnauthorizedException("Missing authorization token");
    }

    const token = authService.validateToken(authToken);

    if (!token) {
      throw new UnauthorizedException("Invalid token");
    }

    if (token.role !== "teacher") {
      throw new ForbiddenException("Only teachers can view student progress");
    }

    // Fetch sessions from Session Service
    const sessions = await SessionService.findAllSessionsByUserId(studentId);

    // Build report
    let totalErrors = 0;
    const sessionReports: SessionReport[] = sessions.map((session) => {
      const errorCount = session.history.entries.filter(
        (e: any) => !!e.errorCode
      ).length;
      totalErrors += errorCount;

      return {
        sessionId: session.id,
        createdAt: session.createdAt,
        stepCount: session.history.entries.length,
        errorCount,
        lastExpression:
          session.history.entries.length > 0
            ? session.history.entries[session.history.entries.length - 1]
                .expressionAfter
            : null,
      };
    });

    return {
      studentId,
      totalSessions: sessions.length,
      totalErrors,
      sessions: sessionReports,
    };
  }
}
