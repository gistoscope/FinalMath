import { describe, expect, it } from "vitest";
import { GenericPatternMatcher } from "./GenericPatternMatcher";
import { parseExpression } from "./ast";

describe("GenericPatternMatcher", () => {
  it("should match simple integers", () => {
    const matcher = new GenericPatternMatcher("5");
    const target = parseExpression("5");
    expect(target).toBeDefined();
    if (target) {
      const result = matcher.matches(target);
      expect(result).not.toBeNull();
    }
  });

  it("should match variables", () => {
    const matcher = new GenericPatternMatcher("x");
    const target = parseExpression("10");
    expect(target).toBeDefined();
    if (target) {
      const result = matcher.matches(target);
      expect(result).not.toBeNull();
      expect(result?.["x"]).toBeDefined();
      expect((result?.["x"] as any).value).toBe("10");
    }
  });

  it("should match binary operations", () => {
    const matcher = new GenericPatternMatcher("a+b");
    const target = parseExpression("1+2");
    if (target) {
      const result = matcher.matches(target);
      expect(result).not.toBeNull();
      expect((result?.["a"] as any).value).toBe("1");
      expect((result?.["b"] as any).value).toBe("2");
    }
  });

  it("should fail on structure mismatch", () => {
    const matcher = new GenericPatternMatcher("a+b");
    const target = parseExpression("1*2");
    if (target) {
      expect(matcher.matches(target)).toBeNull();
    }
  });

  it("should handle allowed types", () => {
    const matcher = new GenericPatternMatcher("n"); // Match variable 'n'
    const target = parseExpression("5");
    const allowed = new Set(["integer"]);

    const result = matcher.matches(target!, allowed);
    expect(result).not.toBeNull();
  });
});
