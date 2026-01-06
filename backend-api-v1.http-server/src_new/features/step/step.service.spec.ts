/**
 * Step Service Tests
 */

import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StepService } from "./step.service";

// Mock the stubs module
vi.mock("../../core/stubs", () => ({
  authService: {
    validateToken: vi.fn(),
  },
  createTeacherDebugPolicy: vi.fn(),
  runOrchestratorStep: vi.fn(),
  SessionService: {
    getHistory: vi.fn(),
    updateHistory: vi.fn(),
  },
}));

import {
  authService,
  createTeacherDebugPolicy,
  runOrchestratorStep,
  SessionService,
} from "../../core/stubs";

describe("StepService", () => {
  let service: StepService;
  let mockDeps: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDeps = {
      invariantRegistry: {},
      policy: {},
      log: vi.fn(),
      logger: { info: vi.fn(), error: vi.fn() },
      primitiveMaster: {},
    };

    service = new StepService(mockDeps);
  });

  describe("handleEntry", () => {
    it("should process entry step successfully", async () => {
      const dto = { expressionLatex: "1+2" };

      (runOrchestratorStep as any).mockResolvedValue({
        status: "step-applied",
        engineResult: { ok: true, newExpressionLatex: "3" },
      });

      const result = await service.handleEntry(dto as any);

      expect(result.ok).toBe(true);
      expect(result.newExpressionLatex).toBe("3");
      expect(runOrchestratorStep).toHaveBeenCalled();
    });

    it("should use teacher policy if policyId provided", async () => {
      const dto = { expressionLatex: "1+2", policyId: "teacher.debug" };

      (runOrchestratorStep as any).mockResolvedValue({ status: "no-op" });

      await service.handleEntry(dto as any);

      expect(createTeacherDebugPolicy).toHaveBeenCalled();
    });

    it("should validate token if provided", async () => {
      const dto = { expressionLatex: "1+2", token: "valid-token" };
      (authService.validateToken as any).mockReturnValue({
        role: "student",
        userId: "u1",
      });
      (runOrchestratorStep as any).mockResolvedValue({ status: "no-op" });

      await service.handleEntry(dto as any);

      expect(authService.validateToken).toHaveBeenCalledWith("valid-token");
    });
  });

  describe("handleUndo", () => {
    it("should handle undo with history", async () => {
      const dto = { sessionId: "sess-1" };

      (SessionService.getHistory as any).mockResolvedValue({
        entries: [{ expressionAfter: "1" }, { expressionAfter: "2" }],
      });

      const result = await service.handleUndo(dto);

      expect(result.ok).toBe(true);
      expect(result.newExpressionLatex).toBe("1");
      expect(SessionService.updateHistory).toHaveBeenCalled();
    });

    it("should return error if no history", async () => {
      const dto = { sessionId: "sess-1" };

      (SessionService.getHistory as any).mockResolvedValue({
        entries: [],
      });

      const result = await service.handleUndo(dto);

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe("no-history-to-undo");
    });
  });
});
