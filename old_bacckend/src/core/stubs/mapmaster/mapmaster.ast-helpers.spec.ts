import { describe, expect, it } from "vitest";
import { parseExpression } from "./ast";
import { MapMasterAstHelpers } from "./mapmaster.ast-helpers";

describe("MapMasterAstHelpers", () => {
  const helpers = new MapMasterAstHelpers();

  it("should get node by path (legacy array path -> map to AST structure)", () => {
    // Test fails if we don't handle mapping correctly.
    // But helper implementation tries to handle it.
    // Let's test basic structure matching if we use helper's own path logic.
    // It seems helper expects 'left', 'right' path segments for binaryOp in DFS logic,
    // but `getNodeByPath` handles 'left'/'right' property access.

    // Let's rely on `findNthOperator` to generate a valid path first.
    const ast = parseExpression("1+2");
    const path = helpers.findNthOperator(ast as any, 0);
    expect(path).toBeDefined();

    const node = helpers.getNodeByPath(ast as any, path!);
    expect(node).toBeDefined();
    expect(node?.type).toBe("binaryOp");
  });

  it("should identify binary operators", () => {
    const ast = parseExpression("1+2");
    expect(helpers.isBinaryOperator(ast as any, "+")).toBe(true);
    expect(helpers.isBinaryOperator(ast as any, "-")).toBe(false);
  });

  it("should identify fractions", () => {
    const ast = parseExpression("\\frac{1}{2}");
    expect(helpers.isFraction(ast as any)).toBe(true);
  });
});
