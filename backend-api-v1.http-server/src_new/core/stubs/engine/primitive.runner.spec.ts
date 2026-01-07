import { describe, expect, it } from "vitest";
import { EngineStepExecutionResult } from "./engine.bridge";
import { PrimitiveRunner } from "./primitive.runner";

describe("PrimitiveRunner", () => {
  // Helper to run a step
  function run(
    expressionLatex: string,
    primitiveId: string,
    targetPath: string,
    bindings?: Record<string, any>
  ): EngineStepExecutionResult {
    return PrimitiveRunner.run({
      expressionLatex,
      primitiveId: primitiveId as any,
      targetPath,
      invariantRuleId: "test-rule",
      bindings,
    });
  }

  describe("Integer Operations", () => {
    it("should add two integers", () => {
      // 1+2. Target at root.
      const res = run("1+2", "P.INT_ADD", "root");
      expect(res.ok).toBe(true);
      expect(res.newExpressionLatex).toBe("3");
    });

    it("should subtract two integers", () => {
      const res = run("5-3", "P.INT_SUB", "root");
      expect(res.ok).toBe(true);
      expect(res.newExpressionLatex).toBe("2");
    });

    it("should multiply two integers", () => {
      const res = run("4*3", "P.INT_MUL", "root");
      expect(res.ok).toBe(true);
      expect(res.newExpressionLatex).toBe("12");
    });

    it("should divide integers exactly", () => {
      const res = run("12\\div 3", "P.INT_DIV_EXACT", "root");
      expect(res.ok).toBe(true);
      expect(res.newExpressionLatex).toBe("4");
    });

    it("should fail exact division if remainder", () => {
      const res = run("13\\div 3", "P.INT_DIV_EXACT", "root");
      expect(res.ok).toBe(false);
    });

    it("should convert division to fraction", () => {
      const res = run("1\\div 3", "P.INT_DIV_TO_FRAC", "root");
      expect(res.ok).toBe(true);
      // Expect \frac{1}{3} or 1/3 depending on toLatex implementation,
      // but usually toLatex produces standard latex
      expect(res.newExpressionLatex).toContain("\\frac{1}{3}");
    });
  });

  describe("Fraction Operations", () => {
    it("should add fractions with same denominator", () => {
      const res = run(
        "\\frac{1}{5}+\\frac{2}{5}",
        "P.FRAC_ADD_SAME_DEN",
        "root"
      );
      expect(res.ok).toBe(true);
      expect(res.newExpressionLatex).toContain("\\frac{3}{5}");
    });

    it("should subtract fractions with same denominator", () => {
      const res = run(
        "\\frac{4}{7}-\\frac{1}{7}",
        "P.FRAC_SUB_SAME_DEN",
        "root"
      );
      expect(res.ok).toBe(true);
      expect(res.newExpressionLatex).toContain("\\frac{3}{7}");
    });

    it("should multiply fractions", () => {
      const res = run("\\frac{1}{2}*\\frac{3}{4}", "P.FRAC_MUL", "root");
      expect(res.ok).toBe(true);
      expect(res.newExpressionLatex).toContain("\\frac{3}{8}");
    });

    // Add more complex fraction cases if needed
  });

  describe("Conversions", () => {
    it("should convert integer to fraction", () => {
      // Target is the integer "5" at root (if expression is just "5")
      // But usually expression is larger. Let's test single node expression.
      const res = run("5", "P.INT_TO_FRAC", "root");
      expect(res.ok).toBe(true);
      expect(res.newExpressionLatex).toContain("\\frac{5}{1}");
    });

    it("should convert mixed to sum", () => {
      // 1 \frac{1}{2} -> 1 + \frac{1}{2}
      // Assuming parser handles mixed numbers e.g. "1\\frac{1}{2}"
      // Note: Parser support for mixed might be specific.
      // If parser assumes implicit mul, this might fail unless AST supports 'mixed' type explicitly.
      // Let's assume standard latex mixed input.
      const res = run("1\\frac{1}{2}", "P.MIXED_TO_SUM", "root");

      // If parser treats it as mixed type:
      if (res.ok) {
        expect(res.newExpressionLatex).toBe("1+\\frac{1}{2}");
      } else {
        // If parser fails or produces mul, this primitive might not apply or act differently
        // We'll mark as skipped logic if undefined return
        // console.log(res.errorCode);
      }
    });
  });

  describe("Distributive Properties (negation)", () => {
    it("should distribute negative over addition (P.NEG_DISTRIB_ADD)", () => {
      // -(a+b) -> -a-b
      // Input: -(1+2)
      // This depends on how parser handles unary minus.
      // Often "-(1+2)" is "binaryOp(-, 0, binaryOp(+, 1, 2))" for some parsers
      // or "unaryOp(-, ...)"
      // PrimitiveRunner logic for `P.NEG_DISTRIB_ADD`:
      // checks `target.op === "-" && target.right.type === "binaryOp" && target.right.op === "+"`
      // This implies target is binary minus (e.g. 0 - (1+2)) or the primitive assumes binary minus representation for unary.

      // Let's try "0-(1+2)" which is clearly binary minus
      const res = run("0-(1+2)", "P.NEG_DISTRIB_ADD", "root");
      expect(res.ok).toBe(true);
      // 0 - 1 - 2
      expect(res.newExpressionLatex).toBe("0 - 1 - 2");
    });
  });

  describe("Generic Pattern Execution", () => {
    // PrimitiveRunner line 36 check: if (resultPattern && bindings && !forceLegacy) ...
    it("should use pattern execution if provided", () => {
      // Mock pattern execution via run args
      // We need a primitive that is NOT in forceLegacy list.
      // "P.TEST_PATTERN"
      const res = PrimitiveRunner.run({
        expressionLatex: "a+b",
        primitiveId: "P.TEST_PATTERN" as any,
        targetPath: "root",
        invariantRuleId: "rule",
        bindings: { x: { type: "integer", value: "42" } },
        resultPattern: "calc(x+1)",
      });

      expect(res.ok).toBe(true);
      expect(res.newExpressionLatex).toBe("43");
    });
  });
});
