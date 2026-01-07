import { describe, expect, it } from "vitest";
import { getNodeAt, parseExpression, replaceNodeAt, toLatex } from "./ast";

describe("AST Parser & Utils", () => {
  describe("parseExpression", () => {
    it("should parse integers", () => {
      const ast = parseExpression("123");
      expect(ast).toBeDefined();
      expect(ast?.type).toBe("integer");
      expect((ast as any).value).toBe("123");
    });

    it("should parse simple Addition", () => {
      const ast = parseExpression("1+2");
      expect(ast).toBeDefined();
      expect(ast?.type).toBe("binaryOp");
      expect((ast as any).op).toBe("+");
    });

    it("should parse fractions", () => {
      const ast = parseExpression("\\frac{1}{2}");
      expect(ast).toBeDefined();
      expect(ast?.type).toBe("fraction");
    });

    it("should parse variables", () => {
      const ast = parseExpression("x");
      expect(ast?.type).toBe("variable");
    });
  });

  describe("toLatex", () => {
    it("should convert AST back to latex", () => {
      const ast = parseExpression("1+2");
      expect(toLatex(ast!)).toBe("1 + 2");
    });
  });

  describe("getNodeAt", () => {
    it("should retrieve root", () => {
      const ast = parseExpression("1");
      const node = getNodeAt(ast!, "root");
      expect(node?.type).toBe("integer");
    });

    it("should retrieve child", () => {
      const ast = parseExpression("1+2");
      const left = getNodeAt(ast!, "term[0]");
      expect(left?.type).toBe("integer");
      expect((left as any).value).toBe("1");
    });
  });

  describe("replaceNodeAt", () => {
    it("should replace root", () => {
      const ast = parseExpression("1");
      const newAst = replaceNodeAt(ast!, "root", {
        type: "integer",
        value: "2",
      });
      expect((newAst as any).value).toBe("2");
    });

    it("should replace child", () => {
      const ast = parseExpression("1+2");
      const newAst = replaceNodeAt(ast!, "term[0]", {
        type: "integer",
        value: "3",
      });
      expect(toLatex(newAst)).toBe("3 + 2");
    });
  });
});
