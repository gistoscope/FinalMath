import { describe, expect, it } from "vitest";
import { INT_ADD_STAGE1, INT_MUL_STAGE1, INT_SUB_STAGE1 } from "./Integers";

describe("Integer Primitives", () => {
  it("should correctly match integer addition", () => {
    expect(INT_ADD_STAGE1.id).toBe("P.INT_ADD");
    const ctx: any = {
      nodeKind: "binaryOp",
      op: "+",
      leftIsInteger: true,
      rightIsInteger: true,
    };
    expect(INT_ADD_STAGE1.isMatch(ctx)).toBe(true);
  });

  it("should match subtraction", () => {
    expect(INT_SUB_STAGE1.id).toBe("P.INT_SUB");
    expect(
      INT_SUB_STAGE1.isMatch({
        nodeKind: "binaryOp",
        op: "-",
        leftIsInteger: true,
        rightIsInteger: true,
      } as any)
    ).toBe(true);
  });

  it("should match multiplication", () => {
    expect(INT_MUL_STAGE1.id).toBe("P.INT_MUL");
    expect(
      INT_MUL_STAGE1.isMatch({
        nodeKind: "binaryOp",
        op: "*",
        leftIsInteger: true,
        rightIsInteger: true,
      } as any)
    ).toBe(true);
  });
});
