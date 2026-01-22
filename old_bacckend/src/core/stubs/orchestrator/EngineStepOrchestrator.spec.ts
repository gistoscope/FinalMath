import { describe, expect, it, vi } from "vitest";
import type {
  EngineStepRequest,
  EngineStepResponseError,
  EngineStepResponseNoStep,
  EngineStepResponseOk,
} from "../protocol/backend-step.types";
import {
  performStepWithOrchestrator,
  type EngineStepOrchestratorDeps,
} from "./EngineStepOrchestrator";
import type { PrimitiveRunnerResult } from "./PrimitiveRunner";

describe("EngineStepOrchestrator", () => {
  const baseRequest: EngineStepRequest = {
    expressionId: "expr-1",
    latex: "1+1",
    mode: "preview",
    clientEvent: { type: "unknown" },
  };

  it("should return error if mode is not preview", async () => {
    const result = await performStepWithOrchestrator(
      { ...baseRequest, mode: "perform" as any }, // casting to bypass TS for test
      {} as any
    );

    expect(result.status).toBe("error");
    expect((result as EngineStepResponseError).errorCode).toBe(
      "internal-error"
    );
  });

  it("should return noStep if primitiveRunnerDeps is missing", async () => {
    const result = await performStepWithOrchestrator(baseRequest, {});

    expect(result.status).toBe("noStep");
    expect((result as EngineStepResponseNoStep).message).toContain(
      "Primitive runner is not configured yet"
    );
  });

  it("should call primitive runner and return OK result", async () => {
    const mockRunner = vi.fn().mockResolvedValue({
      status: "ok",
      latexBefore: "1+1",
      latexAfter: "2",
      appliedPrimitiveIds: ["add"],
      astChanged: true,
    } as PrimitiveRunnerResult);

    const deps: EngineStepOrchestratorDeps = {
      primitiveRunnerDeps: { runner: mockRunner },
      // no mapMaster, so primitiveIds will be []
    };

    const result = await performStepWithOrchestrator(baseRequest, deps);

    expect(result.status).toBe("ok");
    expect((result as EngineStepResponseOk).toLatex).toBe("2");
    expect(mockRunner).toHaveBeenCalled();
    const callArgs = mockRunner.mock.calls[0][0];
    expect(callArgs.primitiveIds).toEqual([]); // No mapMaster
  });

  it("should use MapMaster to select primitive IDs", async () => {
    const mockRunner = vi.fn().mockResolvedValue({
      status: "noStep",
      reason: "no-primitive-applicable",
      latex: "1+1",
    } as PrimitiveRunnerResult);

    const mockMapMaster = {
      planStep: vi.fn().mockResolvedValue({ primitiveIds: ["p1", "p2"] }),
    };

    const deps: EngineStepOrchestratorDeps = {
      primitiveRunnerDeps: { runner: mockRunner },
      mapMaster: mockMapMaster,
    };

    await performStepWithOrchestrator(baseRequest, deps);

    expect(mockMapMaster.planStep).toHaveBeenCalled();
    expect(mockRunner).toHaveBeenCalled();
    const callArgs = mockRunner.mock.calls[0][0];
    expect(callArgs.primitiveIds).toEqual(["p1", "p2"]);
  });

  it("should handle PrimitiveRunner errors gracefully", async () => {
    const mockRunner = vi.fn().mockRejectedValue(new Error("Boom"));

    const deps: EngineStepOrchestratorDeps = {
      primitiveRunnerDeps: { runner: mockRunner },
    };

    const result = await performStepWithOrchestrator(baseRequest, deps);

    expect(result.status).toBe("error");
    expect((result as EngineStepResponseError).message).toContain("Boom");
  });

  it("should handle PrimitiveRunner explicit error result", async () => {
    const mockRunner = vi.fn().mockResolvedValue({
      status: "error",
      errorCode: "engine-error",
      message: "Engine fail",
    } as PrimitiveRunnerResult);

    const deps: EngineStepOrchestratorDeps = {
      primitiveRunnerDeps: { runner: mockRunner },
    };

    const result = await performStepWithOrchestrator(baseRequest, deps);

    expect(result.status).toBe("error");
    expect((result as EngineStepResponseError).message).toBe("Engine fail");
  });
});
