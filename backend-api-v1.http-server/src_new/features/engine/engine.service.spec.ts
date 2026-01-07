/**
 * Engine Service Tests
 */

import "reflect-metadata";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDefaultStudentPolicy,
  createStubInvariantRegistry,
} from "../../core/stubs";
import { HANDLER_DEPS_TOKEN } from "../../core/types";
import { EngineService } from "./engine.service";

describe("EngineService", () => {
  let engineService: EngineService;

  beforeEach(() => {
    // Clear container and register dependencies
    container.clearInstances();

    const mockDeps = {
      invariantRegistry: createStubInvariantRegistry(),
      policy: createDefaultStudentPolicy(),
      log: vi.fn(),
      logger: undefined,
    };

    container.register(HANDLER_DEPS_TOKEN, { useValue: mockDeps });
    engineService = container.resolve(EngineService);
  });

  describe("handleEntryStep", () => {
    it("should handle entry step with valid input", async () => {
      const result = await engineService.handleEntryStep({
        expressionLatex: "1+2",
        sessionId: "test-session",
        courseId: "default",
      });

      expect(result).toBeDefined();
      expect(result.ok).toBe(false); // Stub returns no-candidates
      expect(result.errorCode).toBe("no-candidates");
    });

    it("should generate session ID if not provided", async () => {
      const result = await engineService.handleEntryStep({
        expressionLatex: "3+4",
      });

      expect(result).toBeDefined();
    });

    it("should use teacher debug policy when specified", async () => {
      const result = await engineService.handleEntryStep({
        expressionLatex: "5+6",
        policyId: "teacher.debug",
      });

      expect(result).toBeDefined();
    });

    it("should validate token if provided", async () => {
      const result = await engineService.handleEntryStep({
        expressionLatex: "7+8",
        token: "valid-token",
      });

      expect(result).toBeDefined();
    });
  });

  describe("handleUndoStep", () => {
    it("should return error when no history to undo", async () => {
      const result = await engineService.handleUndoStep({
        sessionId: `undo-test-${Date.now()}`,
      });

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe("no-history-to-undo");
    });
  });

  describe("handleHintRequest", () => {
    it("should return hint stub message", async () => {
      const result = await engineService.handleHintRequest({
        expressionLatex: "1+2",
        sessionId: "test-session",
        courseId: "default",
      });

      expect(result).toBeDefined();
      expect(result.hint).toContain("not yet implemented");
    });
  });
});
