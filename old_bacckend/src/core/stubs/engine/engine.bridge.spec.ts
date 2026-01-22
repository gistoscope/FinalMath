import { describe, expect, it, vi } from "vitest";
import type { MapMasterCandidate, MapMasterInput } from "../mapmaster/index";
import {
  executeStepViaEngine,
  type EngineStepExecutionResult,
} from "./engine.bridge";
import { PrimitiveRunner } from "./primitive.runner";

// Mock PrimitiveRunner
vi.mock("./primitive.runner", () => ({
  PrimitiveRunner: {
    run: vi.fn(),
  },
}));

describe("Engine Bridge", () => {
  const mockCandidate: MapMasterCandidate = {
    primitiveIds: ["P.INT_ADD"],
    targetPath: "root",
    invariantRuleId: "rule-1",
    bindings: { a: 1, b: 2 },
    resultPattern: "test-pattern",
  };

  const mockInput: MapMasterInput = {
    expressionLatex: "1+2",
    invariantSetId: "set-1",
  };

  it("should convert MapMaster types to EngineStepExecutionRequest", async () => {
    const mockResult: EngineStepExecutionResult = {
      ok: true,
      newExpressionLatex: "3",
    };
    (PrimitiveRunner.run as any).mockReturnValue(mockResult);

    const result = await executeStepViaEngine(mockCandidate, mockInput);

    expect(PrimitiveRunner.run).toHaveBeenCalledWith({
      expressionLatex: mockInput.expressionLatex,
      targetPath: mockCandidate.targetPath,
      primitiveId: mockCandidate.primitiveIds[0],
      invariantRuleId: mockCandidate.invariantRuleId,
      bindings: mockCandidate.bindings,
      resultPattern: mockCandidate.resultPattern,
    });
    expect(result).toEqual(mockResult);
  });

  it("should handle PrimitiveRunner errors gracefully", async () => {
    (PrimitiveRunner.run as any).mockImplementation(() => {
      throw new Error("Engine failure");
    });

    const result = await executeStepViaEngine(mockCandidate, mockInput);

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("Engine failure");
  });

  it("should handle unknown errors", async () => {
    (PrimitiveRunner.run as any).mockImplementation(() => {
      throw "Unknown";
    });

    const result = await executeStepViaEngine(mockCandidate, mockInput);

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("Unknown engine error");
  });
});
