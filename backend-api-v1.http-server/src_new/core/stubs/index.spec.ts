/**
 * Core Stubs Tests
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  authService,
  createDefaultStudentPolicy,
  createStubInvariantRegistry,
  createTeacherDebugPolicy,
  instrumentLatex,
  parseExpression,
  runOrchestratorStep,
  SessionService,
  StepSnapshotStore,
  TraceHub,
} from "./index";

describe("Core Stubs", () => {
  describe("authService", () => {
    it("should return null for empty token", () => {
      const result = authService.validateToken("");
      expect(result).toBeNull();
    });

    it("should return auth token for valid token", () => {
      const result = authService.validateToken("valid-token");
      expect(result).not.toBeNull();
      expect(result?.userId).toBe("stub-user");
      expect(result?.role).toBe("student");
    });
  });

  describe("SessionService", () => {
    beforeEach(() => {
      // Reset sessions between tests (if needed)
    });

    it("should create new session if not exists", async () => {
      const sessionId = `test-session-${Date.now()}`;
      const history = await SessionService.getHistory(sessionId);

      expect(history).toBeDefined();
      expect(history.entries).toEqual([]);
    });

    it("should update history", async () => {
      const sessionId = `test-session-${Date.now()}`;
      const history = await SessionService.getHistory(sessionId);

      history.entries.push({
        expressionBefore: "1+2",
        expressionAfter: "3",
        timestamp: Date.now(),
      });

      await SessionService.updateHistory(sessionId, history);

      const updatedHistory = await SessionService.getHistory(sessionId);
      expect(updatedHistory.entries.length).toBe(1);
      expect(updatedHistory.entries[0].expressionAfter).toBe("3");
    });

    it("should find sessions by user ID", async () => {
      const sessions = await SessionService.findAllSessionsByUserId("user-1");
      expect(Array.isArray(sessions)).toBe(true);
    });
  });

  describe("StepPolicyConfig", () => {
    it("should create default student policy", () => {
      const policy = createDefaultStudentPolicy();
      expect(policy.id).toBe("student.default");
      expect(policy.maxCandidatesToShow).toBe(1);
    });

    it("should create teacher debug policy", () => {
      const policy = createTeacherDebugPolicy();
      expect(policy.id).toBe("teacher.debug");
      expect(policy.maxCandidatesToShow).toBe(999);
    });
  });

  describe("InvariantRegistry", () => {
    it("should create stub invariant registry", () => {
      const registry = createStubInvariantRegistry();
      expect(registry).toBeDefined();
      expect(typeof registry.getInvariantSetById).toBe("function");
    });

    it("should return invariant set for any ID", () => {
      const registry = createStubInvariantRegistry();
      const set = registry.getInvariantSetById("test-set");

      expect(set).not.toBeNull();
      expect(set?.id).toBe("test-set");
    });
  });

  describe("runOrchestratorStep", () => {
    it("should return no-candidates for stub", async () => {
      const ctx = {
        invariantRegistry: createStubInvariantRegistry(),
        policy: createDefaultStudentPolicy(),
      };

      const req = {
        sessionId: "test-session",
        courseId: "default",
        expressionLatex: "1+2",
        selectionPath: null,
        userRole: "student" as const,
      };

      const result = await runOrchestratorStep(ctx, req);

      expect(result.status).toBe("no-candidates");
      expect(result.history).toBeDefined();
    });
  });

  describe("AST Stubs", () => {
    it("should parse expression and return stub AST", () => {
      const ast = parseExpression("1+2");
      expect(ast).toBeDefined();
      expect(ast.type).toBe("stub");
    });

    it("should instrument latex (return as-is in stub)", () => {
      const result = instrumentLatex("\\frac{1}{2}");
      expect(result).toBe("\\frac{1}{2}");
    });
  });

  describe("StepSnapshotStore", () => {
    it("should return null for getLatest initially", () => {
      expect(StepSnapshotStore.getLatest()).toBeNull();
    });

    it("should return empty array for getAll", () => {
      expect(StepSnapshotStore.getAll()).toEqual([]);
    });
  });

  describe("TraceHub", () => {
    it("should return empty array for getAll", () => {
      expect(TraceHub.getAll()).toEqual([]);
    });

    it("should clear without error", () => {
      expect(() => TraceHub.clear()).not.toThrow();
    });
  });
});
