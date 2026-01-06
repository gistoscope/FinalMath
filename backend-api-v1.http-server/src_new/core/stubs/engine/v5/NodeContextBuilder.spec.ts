import { describe, expect, it } from "vitest";
import { AstNode } from "../../mapmaster/ast";
import { NodeContextBuilder } from "./NodeContextBuilder";

describe("NodeContextBuilder", () => {
  const builder = new NodeContextBuilder();

  it("should build context for root node", () => {
    const ast: AstNode = { type: "integer", value: "1", id: "root" } as any;
    const ctx = builder.buildContext({
      expressionId: "1",
      ast,
      click: { nodeId: "root", kind: "number" },
    });

    expect(ctx.nodeId).toBe("root");
    expect(ctx.expressionId).toBe("1");
  });

  it("should handle binary ops", () => {
    const ast: AstNode = {
      type: "binaryOp",
      op: "+",
      id: "root",
      left: { type: "integer", value: "1", id: "l" },
      right: { type: "integer", value: "2", id: "r" },
    } as any;

    const ctx = builder.buildContext({
      expressionId: "1",
      ast,
      click: { nodeId: "root", kind: "operator" },
    });

    expect(ctx.operatorLatex).toBe("+");
    expect(ctx.leftOperandType).toBe("int");
    expect(ctx.rightOperandType).toBe("int");
  });
});
