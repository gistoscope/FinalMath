/**
 * INT_TO_FRAC Executor Tests
 *
 * Tests for contextual LCM-based denominator normalization.
 */

import "reflect-metadata";

import { beforeEach, describe, expect, it } from "vitest";
import { AstParser } from "../../../src/core/ast/parser.ast.js";
import { AstUtils } from "../../../src/core/ast/utils.ast.js";
import { FractionContextAnalyzer } from "../../../src/core/orchestrator/analyzers/fraction-context.analyzer.js";
import { IntToFracExecutor } from "../../../src/core/orchestrator/executors/int-to-frac.executor.js";

// Helper to parse expressions
const parser = new AstParser();
const parseExpression = (latex: string) => parser.parseExpression(latex);

describe("IntToFracExecutor", () => {
  let executor: IntToFracExecutor;
  let astUtils: AstUtils;
  let analyzer: FractionContextAnalyzer;

  beforeEach(() => {
    astUtils = new AstUtils();
    analyzer = new FractionContextAnalyzer(astUtils);
    executor = new IntToFracExecutor(astUtils, analyzer);
  });

  describe("Simple conversions (no context)", () => {
    it("should convert standalone integer to fraction with denominator 1", () => {
      const ast = parseExpression("5");
      const result = executor.execute(ast!, "root");

      expect(result.ok).toBe(true);
      expect(result.newLatex).toBe("\\frac{5}{1}");
    });

    it("should convert integer 1 to 1/1 when no fractional context", () => {
      const ast = parseExpression("1");
      const result = executor.execute(ast!, "root");

      expect(result.ok).toBe(true);
      expect(result.newLatex).toBe("\\frac{1}{1}");
    });

    it("should convert integer in simple addition without fractions", () => {
      const ast = parseExpression("2 + 3");
      const result = executor.execute(ast!, "term[1]");

      expect(result.ok).toBe(true);
      expect(result.newLatex).toContain("\\frac{3}{1}");
    });
  });

  describe("Contextual conversions (LCM-based)", () => {
    it("should convert 1 to 5/5 when adjacent fraction has denominator 3 and opposite has 5", () => {
      // Expression: 1/3 * 1 + 2/5 * 1
      // When clicking on the first "1" (multiplied by 1/3):
      // - Left denominator: 3
      // - Right denominator: 5
      // - LCM(3,5) = 15
      // - To make 1/3 reach 15, multiply by 5/5
      const ast = parseExpression("\\frac{1}{3} \\cdot 1 + \\frac{2}{5} \\cdot 1");
      if (!ast) throw new Error("Failed to parse expression");

      // Path to first "1": root -> left branch -> right child of multiplication
      const result = executor.execute(ast, "term[0].term[1]");

      expect(result.ok).toBe(true);
      expect(result.newLatex).toContain("\\frac{5}{5}");
    });

    it("should convert 1 to 3/3 when clicking on second term with denominator 5", () => {
      // Expression: 1/3 * 1 + 2/5 * 1
      // When clicking on the second "1" (multiplied by 2/5):
      // - Need to multiply by 3/3 to get 2/5 to 6/15
      const ast = parseExpression("\\frac{1}{3} \\cdot 1 + \\frac{2}{5} \\cdot 1");
      if (!ast) throw new Error("Failed to parse expression");

      // Path to second "1": root -> right branch -> right child of multiplication
      const result = executor.execute(ast, "term[1].term[1]");

      expect(result.ok).toBe(true);
      expect(result.newLatex).toContain("\\frac{3}{3}");
    });

    it("should handle equal denominators - use same denominator", () => {
      // Expression: 1/4 * 1 + 3/4 * 1
      // Denominators are equal (4), so both should become 4/4
      const ast = parseExpression("\\frac{1}{4} \\cdot 1 + \\frac{3}{4} \\cdot 1");
      if (!ast) throw new Error("Failed to parse expression");

      const result = executor.execute(ast, "term[0].term[1]");

      expect(result.ok).toBe(true);
      expect(result.newLatex).toContain("\\frac{4}{4}");
    });
  });

  describe("Forced simple mode", () => {
    it("should use 1/1 when forceSimple is true even with fractional context", () => {
      const ast = parseExpression("\\frac{1}{3} \\cdot 1 + \\frac{2}{5} \\cdot 1");
      if (!ast) throw new Error("Failed to parse expression");

      const result = executor.execute(ast, "term[0].term[1]", { forceSimple: true });

      expect(result.ok).toBe(true);
      // Should NOT contain 5/5, should use 1/1 pattern
      expect(result.newLatex).not.toContain("\\frac{5}{5}");
    });
  });

  describe("Forced denominator override", () => {
    it("should use provided denominator when forceDenominator is set", () => {
      const ast = parseExpression("1");
      const result = executor.execute(ast!, "root", { forceDenominator: "7" });

      expect(result.ok).toBe(true);
      expect(result.newLatex).toBe("\\frac{7}{7}");
    });
  });

  describe("Validation", () => {
    it("should reject non-integer targets", () => {
      const ast = parseExpression("\\frac{1}{2}");
      const result = executor.execute(ast!, "root");

      expect(result.ok).toBe(false);
      expect(result.error).toContain("not integer");
    });

    it("should reject invalid paths", () => {
      const ast = parseExpression("1 + 2");
      const result = executor.execute(ast!, "term[99]");

      expect(result.ok).toBe(false);
    });
  });
});

describe("FractionContextAnalyzer", () => {
  let analyzer: FractionContextAnalyzer;
  let astUtils: AstUtils;

  beforeEach(() => {
    astUtils = new AstUtils();
    analyzer = new FractionContextAnalyzer(astUtils);
  });

  it("should extract denominators from expression with fractions", () => {
    const ast = parseExpression("\\frac{1}{3} + \\frac{2}{5}");
    if (!ast) throw new Error("Failed to parse");

    const context = analyzer.analyzeContext(ast, "term[0]");

    expect(context.denominators).toContain(3);
    expect(context.denominators).toContain(5);
    expect(context.lcm).toBe(15);
  });

  it("should detect when denominators are already equal", () => {
    const ast = parseExpression("\\frac{1}{4} + \\frac{3}{4}");
    if (!ast) throw new Error("Failed to parse");

    const context = analyzer.analyzeContext(ast, "term[0]");

    expect(context.denominatorsEqual).toBe(true);
    expect(context.requiresNormalization).toBe(false);
  });

  it("should detect when normalization is required", () => {
    const ast = parseExpression("\\frac{1}{3} + \\frac{2}{5}");
    if (!ast) throw new Error("Failed to parse");

    const context = analyzer.analyzeContext(ast, "term[0]");

    expect(context.denominatorsEqual).toBe(false);
    expect(context.requiresNormalization).toBe(true);
  });
});
