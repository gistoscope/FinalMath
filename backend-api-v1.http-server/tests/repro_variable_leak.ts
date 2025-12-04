import { parseExpression, toLatex } from '../src/mapmaster/ast';
import { PrimitiveRunner } from '../src/engine/primitive.runner';

// Mock Rule for Fraction Addition Same Denominator
// Pattern: a/c + b/c -> (a+b)/c
const MOCK_RULE = {
    id: "frac_add_same",
    pattern: "a/c + b/c",
    result: "(a+b)/c"
};

function test() {
    console.log("--- Testing Variable Substitution Leak ---");
    const latex = "6/2 + 12/2";
    console.log("Input:", latex);

    // Manually construct bindings as if GenericPatternMatcher produced them
    // a=6, b=12, c=2
    const bindings = {
        "a": { type: "integer", value: "6" },
        "b": { type: "integer", value: "12" },
        "c": { type: "integer", value: "2" }
    };

    const request = {
        expressionLatex: latex,
        targetPath: "root", // Assuming we match at root
        primitiveId: "P.FRAC_ADD_SAME", // Dummy ID
        invariantRuleId: "frac_add_same",
        bindings: bindings as any,
        resultPattern: MOCK_RULE.result
    };

    try {
        const result = PrimitiveRunner.run(request);

        if (!result.ok) {
            console.error("PrimitiveRunner failed:", result.errorCode);
            return;
        }

        const output = result.newExpressionLatex!;
        console.log("Output:", output);

        // Check for variables more strictly (e.g. surrounded by non-word chars or just check for absence of specific variable names if possible)
        // But simpler: check if we have the expected numbers.
        const hasNumbers = output.includes("6") && output.includes("12") && output.includes("2");
        const hasVars = /[abc]/.test(output.replace(/frac/g, "")); // Remove 'frac' before checking for a,b,c

        if (hasVars) {
            console.log("FAIL: Variables leaked into output!");
        } else if (hasNumbers) {
            // We expect (6+12)/2 or similar.
            // Note: (a+b)/c -> (6+12)/2.
            // If GroupNode is working, it should be (6+12)/2.
            // If not, it might be 6+12/2 (wrong precedence) but still numbers.
            console.log("PASS: Substitution successful.");
        } else {
            console.log("WARN: Unexpected output format, but maybe no leak?", output);
        }

    } catch (e) {
        console.error("Error running primitive:", e);
    }
}

test();
