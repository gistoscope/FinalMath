import { parseExpression } from "./ast";
export class GenericPatternMatcher {
    constructor(pattern) {
        const ast = parseExpression(pattern);
        if (!ast) {
            throw new Error(`Invalid pattern: ${pattern}`);
        }
        this.patternAst = ast;
    }
    matches(target, allowedTypes) {
        const bindings = {};
        if (this.matchNode(this.patternAst, target, bindings, allowedTypes)) {
            return bindings;
        }
        return null;
    }
    matchNode(pattern, target, bindings, allowedTypes) {
        // 1. Variable Binding
        if (pattern.type === "variable") {
            const varName = pattern.name;
            // Check type constraint
            if (allowedTypes) {
                // If allowedTypes says 'integer', we should accept:
                // 1. Target is 'integer'
                // 2. Target is 'fraction' but effectively integer (denom=1)? 
                //    Actually, if pattern expects integer variable 'a', and target is '3/1', 
                //    we might want to bind 'a' to '3' (IntegerNode) or '3/1' (FractionNode).
                //    The user said: "Matcher should accept any Num node without fraction part".
                let isCompatible = false;
                if (allowedTypes.has(target.type)) {
                    isCompatible = true;
                }
                else if (allowedTypes.has('integer')) {
                    // Check if target can be treated as integer
                    if (target.type === 'fraction' && target.denominator === '1') {
                        isCompatible = true;
                    }
                    // What if target is 'integer' but allowedTypes doesn't have it? (Unlikely if we passed 'integer')
                }
                if (!isCompatible) {
                    return false;
                }
            }
            if (bindings[varName]) {
                // Variable already bound, check equality
                return this.areNodesEqual(bindings[varName], target);
            }
            else {
                // Bind variable
                bindings[varName] = target;
                return true;
            }
        }
        // 2. Type Mismatch
        if (pattern.type !== target.type) {
            // Special case: Pattern is a/b (binaryOp /) but target is Fraction
            if (pattern.type === "binaryOp" && pattern.op === "/" && target.type === "fraction") {
                // Treat target as binaryOp /
                const targetAsBinary = {
                    type: "binaryOp",
                    op: "/",
                    left: { type: "integer", value: target.numerator },
                    right: { type: "integer", value: target.denominator }
                };
                return this.matchNode(pattern.left, targetAsBinary.left, bindings, allowedTypes) &&
                    this.matchNode(pattern.right, targetAsBinary.right, bindings, allowedTypes);
            }
            return false;
        }
        // 3. Structural Matching
        switch (pattern.type) {
            case "integer":
                if (target.type === "integer")
                    return target.value === pattern.value;
                if (target.type === "fraction" && target.denominator === "1")
                    return target.numerator === pattern.value;
                return false;
            case "fraction":
                return target.numerator === pattern.numerator &&
                    target.denominator === pattern.denominator;
            case "mixed":
                return target.whole === pattern.whole &&
                    target.numerator === pattern.numerator &&
                    target.denominator === pattern.denominator;
            case "binaryOp":
                return target.op === pattern.op &&
                    this.matchNode(pattern.left, target.left, bindings, allowedTypes) &&
                    this.matchNode(pattern.right, target.right, bindings, allowedTypes);
        }
        return false;
    }
    areNodesEqual(a, b) {
        // Simple structural equality
        if (a.type !== b.type)
            return false;
        switch (a.type) {
            case "integer":
                return a.value === b.value;
            case "fraction":
                return a.numerator === b.numerator &&
                    a.denominator === b.denominator;
            case "mixed":
                return a.whole === b.whole &&
                    a.numerator === b.numerator &&
                    a.denominator === b.denominator;
            case "binaryOp":
                return a.op === b.op &&
                    this.areNodesEqual(a.left, b.left) &&
                    this.areNodesEqual(a.right, b.right);
            case "variable":
                return a.name === b.name;
        }
        return false;
    }
}
