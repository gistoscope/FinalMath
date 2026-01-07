import { describe, expect, it, vi } from "vitest";
import { PrimitiveMaster, createPrimitiveMaster } from "./PrimitiveMaster";

describe("PrimitiveMaster (Main)", () => {
  const mockDeps = {
    parseLatexToAst: vi.fn(),
    log: vi.fn(),
  };

  it("should be created via factory", () => {
    const pm = createPrimitiveMaster(mockDeps);
    expect(pm).toBeInstanceOf(PrimitiveMaster);
  });

  it("should resolve primitive execution", async () => {
    const pm = new PrimitiveMaster(mockDeps);
    mockDeps.parseLatexToAst.mockResolvedValue({
      type: "integer",
      value: "5",
      id: "root",
    });

    const outcome = await pm.resolvePrimitive({
      expressionId: "expr-1",
      expressionLatex: "5",
      click: { nodeId: "root", kind: "number" },
    });

    expect(outcome).toBeDefined();
    expect(outcome.kind).toBeDefined();
  });
});
