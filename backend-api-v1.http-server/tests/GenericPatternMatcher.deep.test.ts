import { describe, test, expect } from "vitest";
import { GenericPatternMatcher } from "../src/mapmaster/GenericPatternMatcher";
import { parseExpression, toLatex } from "../src/mapmaster/ast";

describe("GenericPatternMatcher Deep Matching", () => {
    test("should match a/c + b/c with 1/7 + 3/7", () => {
        const pattern = "a/c + b/c";
        const targetLatex = "\\frac{1}{7} + \\frac{3}{7}";
        const target = parseExpression(targetLatex);
        if (!target) throw new Error("Parse failed");

        const matcher = new GenericPatternMatcher(pattern);
        const bindings = matcher.matches(target);

        expect(bindings).not.toBeNull();
        // Use toLatex for safe comparison
        expect(toLatex(bindings!["a"])).toBe("1");
        expect(toLatex(bindings!["b"])).toBe("3");
        expect(toLatex(bindings!["c"])).toBe("7");
    });

    test("should NOT match a/c + b/c with 1/7 + 3/8", () => {
        const pattern = "a/c + b/c";
        const targetLatex = "\\frac{1}{7} + \\frac{3}{8}";
        const target = parseExpression(targetLatex);
        if (!target) throw new Error("Parse failed");

        const matcher = new GenericPatternMatcher(pattern);
        const bindings = matcher.matches(target);

        expect(bindings).toBeNull();
    });

    test("should match a/c + b/c with 1/(2+3) + 4/((2+3)) (Group vs BinaryOp)", () => {
        const pattern = "a/c + b/c";
        const targetLatex = "\\frac{1}{2+3} + \\frac{4}{(2+3)}";
        const target = parseExpression(targetLatex);
        if (!target) throw new Error("Parse failed");

        const matcher = new GenericPatternMatcher(pattern);
        const bindings = matcher.matches(target);

        expect(bindings).not.toBeNull();
        expect(toLatex(bindings!["a"])).toBe("1");
        expect(toLatex(bindings!["b"])).toBe("4");
        // c should bind to 2+3
        expect(toLatex(bindings!["c"])).toBe("2 + 3");
    });

    test("should match a/c + b/c with 1/(1/2) + 3/(1/(2)) (Fraction vs BinaryOp)", () => {
        const pattern = "a/c + b/c";
        // First denom is \frac{1}{2} (FractionNode)
        // Second denom is 1/(2) (BinaryOpNode)
        const targetLatex = "\\frac{1}{\\frac{1}{2}} + \\frac{3}{1/(2)}";
        const target = parseExpression(targetLatex);
        if (!target) throw new Error("Parse failed");

        const matcher = new GenericPatternMatcher(pattern);
        const bindings = matcher.matches(target);

        expect(bindings).not.toBeNull();
        // c should bind to \frac{1}{2} (FractionNode)
        // AND match 1/(2) (BinaryOpNode)
    });
});
