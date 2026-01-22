import { describe, expect, it, vi } from "vitest";
import {
  runPrimitiveStep,
  type PrimitiveRunnerRequest,
  type PrimitiveRunnerResult,
} from "./PrimitiveRunner";

describe("PrimitiveRunner", () => {
  it("should delegate execution to the injected runner", async () => {
    const mockResult: PrimitiveRunnerResult = {
      status: "ok",
      latexBefore: "before",
      latexAfter: "after",
      appliedPrimitiveIds: ["p1"],
      astChanged: true,
    };

    const mockRunner = vi.fn().mockResolvedValue(mockResult);

    const request: PrimitiveRunnerRequest = {
      mode: "preview",
      latex: "1+1",
      primitiveIds: ["p1"],
    };

    const result = await runPrimitiveStep(request, { runner: mockRunner });

    expect(mockRunner).toHaveBeenCalledWith(request);
    expect(result).toBe(mockResult);
  });
});
