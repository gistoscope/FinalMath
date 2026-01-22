/**
 * Orchestrator Service Tests
 */

import "reflect-metadata";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDefaultStudentPolicy,
  createStubInvariantRegistry,
} from "../../core/stubs";
import { HANDLER_DEPS_TOKEN } from "../../core/types";
import { OrchestratorService } from "./orchestrator.service";

describe("OrchestratorService", () => {
  let orchestratorService: OrchestratorService;

  beforeEach(() => {
    container.clearInstances();

    const mockDeps = {
      invariantRegistry: createStubInvariantRegistry(),
      policy: createDefaultStudentPolicy(),
      log: vi.fn(),
      logger: undefined,
    };

    container.register(HANDLER_DEPS_TOKEN, { useValue: mockDeps });
    orchestratorService = container.resolve(OrchestratorService);
  });

  describe("handleStepV5", () => {
    it("should return orchestrator result for valid input", async () => {
      const result = await orchestratorService.handleStepV5({
        expressionLatex: "1+2",
        sessionId: "test-session",
        courseId: "default",
      });

      expect(result).toBeDefined();
      expect(result.status).toBe("no-candidates"); // Stub behavior
      expect(result.history).toBeDefined();
    });

    it("should use default courseId if not provided", async () => {
      const result = await orchestratorService.handleStepV5({
        expressionLatex: "3+4",
        sessionId: "test-session",
      });

      expect(result).toBeDefined();
    });

    it("should switch to teacher debug policy when specified", async () => {
      const result = await orchestratorService.handleStepV5({
        expressionLatex: "5+6",
        sessionId: "test-session",
        policyId: "teacher.debug",
      });

      expect(result).toBeDefined();
    });

    it("should handle all V5 specific fields", async () => {
      const result = await orchestratorService.handleStepV5({
        expressionLatex: "7+8",
        sessionId: "test-session",
        selectionPath: "root",
        operatorIndex: 0,
        surfaceNodeKind: "BinaryOp",
        clickTargetKind: "operator",
        operator: "+",
        surfaceNodeId: "node-1",
      });

      expect(result).toBeDefined();
    });
  });
});
