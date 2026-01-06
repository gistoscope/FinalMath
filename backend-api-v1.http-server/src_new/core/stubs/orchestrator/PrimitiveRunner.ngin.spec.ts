import { describe, expect, it } from "vitest";
import { createNginPrimitiveRunner } from "./PrimitiveRunner.ngin";

describe("PrimitiveRunner.ngin", () => {
  it("should create default runner", () => {
    const runner = createNginPrimitiveRunner();
    expect(runner).toBeDefined();
  });

  it("should run preview mode", async () => {
    const runner = createNginPrimitiveRunner();
    const result = await runner({
      mode: "preview",
      latex: "1+2",
      primitiveIds: ["P.UNK"],
    });

    // Default runner returns generic + placeholder if + exists
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.astChanged).toBe(true);
    }
  });

  it("should fail on invalid mode", async () => {
    const runner = createNginPrimitiveRunner();
    const result = await runner({
      mode: "commit" as any,
      latex: "1+2",
      primitiveIds: ["P"],
    });
    expect(result.status).toBe("error");
  });

  it("should handle fraction primitives if mocked", async () => {
    // This tests logic inside createNginPrimitiveRunnerDeps
    const runner = createNginPrimitiveRunner();

    // Try SIMPLIFY generic logic
    const result = await runner({
      mode: "preview",
      latex: "2/4",
      primitiveIds: ["P0.FRAC_SIMPLIFY"],
    });
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.latexAfter).toBe("1/2");
    }
  });
});
