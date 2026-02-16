import { describe, expect, it } from "vitest";
import { preprocessLatexFractions } from "./latex-decimal.util.js";

describe("preprocessLatexFractions", () => {
  it("should convert fractions when decimal context is present", () => {
    const input = "1.2 + \\frac{3}{5} - 0.4";
    const expected = "1.2 + 0.6 - 0.4";
    expect(preprocessLatexFractions(input)).toBe(expected);
  });

  it("should convert clean fractions even without decimal context", () => {
    const input = "1 + \\frac{1}{2}";
    const expected = "1 + 0.5";
    expect(preprocessLatexFractions(input)).toBe(expected);
  });

  it("should NOT convert unclean fractions without decimal context", () => {
    const input = "1 + \\frac{1}{3}"; // 0.333...
    expect(preprocessLatexFractions(input)).toBe(input);
  });

  it("should convert unclean fractions WITH decimal context", () => {
    const input = "1.0 + \\frac{1}{3}";
    const expected = "1.0 + 0.333333";
    expect(preprocessLatexFractions(input)).toBe(expected);
  });

  it("should handle whitespace in fractions", () => {
    const input = "\\frac { 10 } { 4 }"; // 2.5
    const expected = "2.5";
    expect(preprocessLatexFractions(input)).toBe(expected);
  });

  it("should ignore nested braces (simple regex limitation/feature)", () => {
    const input = "\\frac{\\frac{1}{2}}{3}";
    expect(preprocessLatexFractions(input)).toBe(input);
  });

  it("should handle negative numbers", () => {
    const input = "\\frac{-1}{2}";
    const expected = "-0.5";
    expect(preprocessLatexFractions(input)).toBe(expected);
  });

  it("should handle multiple fractions mixed", () => {
    // 1/2 is clean (0.5), 1/3 is unclean.
    // Context checks original string. Original string has NO decimals.
    // So 1/2 converts. 1/3 does not.
    const input = "\\frac{1}{2} + \\frac{1}{3}";
    const expected = "0.5 + \\frac{1}{3}";
    expect(preprocessLatexFractions(input)).toBe(expected);
  });
});
