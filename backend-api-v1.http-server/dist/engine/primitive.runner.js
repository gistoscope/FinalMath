/**
 * Primitive Runner (TzV1.1)
 *
 * Executes atomic primitives on the AST.
 * This serves as the internal "Engine Stub" for V1.1.
 */
import { getNodeAt, parseExpression, replaceNodeAt, toLatex } from "../mapmaster/ast";
export class PrimitiveRunner {
    static run(req) {
        const { expressionLatex, primitiveId, targetPath, bindings, resultPattern } = req;
        const ast = parseExpression(expressionLatex);
        if (!ast)
            return { ok: false, errorCode: "parse-error" };
        const targetNode = getNodeAt(ast, targetPath);
        try {
            let newAst;
            // Force legacy execution for primitives that require arithmetic simplification
            // which generic pattern execution (substitution only) cannot handle yet.
            const forceLegacy = [
                "P.FRAC_ADD_SAME",
                "P.FRAC_SUB_SAME",
                "P.INT_PLUS_FRAC",
                "P.INT_MINUS_FRAC",
                "P.FRAC_ADD_DIFF",
                "P.FRAC_SUB_DIFF",
                "P4.FRAC_ADD_BASIC",
                "P4.FRAC_SUB_BASIC"
            ].includes(primitiveId);
            if (resultPattern && bindings && !forceLegacy) {
                // Use Generic Pattern Execution
                newAst = this.generateResultFromPattern(ast, targetPath, resultPattern, bindings);
            }
            else {
                // Fallback to legacy execution
                newAst = this.applyPrimitive(ast, targetNode, primitiveId, targetPath);
            }
            if (!newAst)
                return { ok: false, errorCode: "primitive-failed" };
            return {
                ok: true,
                newExpressionLatex: toLatex(newAst)
            };
        }
        catch (e) {
            return { ok: false, errorCode: e instanceof Error ? e.message : "unknown-error" };
        }
    }
    static generateResultFromPattern(root, path, resultPattern, bindings) {
        // 1. Check for calc(...)
        if (resultPattern.startsWith("calc(")) {
            const expr = resultPattern.substring(5, resultPattern.length - 1);
            // Evaluate expression with bindings
            // We need a simple evaluator that can handle basic arithmetic and variables
            const val = this.evaluateCalc(expr, bindings);
            if (val === null)
                return undefined;
            return replaceNodeAt(root, path, { type: "integer", value: val.toString() });
        }
        // 2. Structural substitution
        // Parse the result pattern into an AST template
        const templateAst = parseExpression(resultPattern);
        if (!templateAst)
            return undefined;
        // Substitute variables in the template
        const substitutedAst = this.substituteVariables(templateAst, bindings);
        // Replace the target node with the substituted AST
        return replaceNodeAt(root, path, substitutedAst);
    }
    static evaluateCalc(expr, bindings) {
        // Simple evaluator for "a+b", "a*b", etc.
        // Replace variables with values
        let evalExpr = expr;
        for (const [key, node] of Object.entries(bindings)) {
            if (node.type === "integer") {
                evalExpr = evalExpr.replace(new RegExp(key, "g"), node.value);
            }
            else if (node.type === "fraction") {
                // Handle fraction values if needed?
                // For now assume calc() is only for integers/decimals
                return null;
            }
        }
        try {
            // Safety check: only allow digits, operators, parens, spaces
            if (!/^[\d\+\-\*\/\(\)\s\.]+$/.test(evalExpr))
                return null;
            // Use Function constructor for evaluation (safe-ish given the regex check)
            return new Function(`return ${evalExpr}`)();
        }
        catch (e) {
            return null;
        }
    }
    static substituteVariables(node, bindings) {
        if (node.type === "variable") {
            const binding = bindings[node.name];
            if (binding) {
                return binding; // Return the bound node (deep copy might be safer but immutable structure is fine)
            }
            return node; // Unbound variable? Should not happen if pattern matches
        }
        if (node.type === "binaryOp") {
            return {
                ...node,
                left: this.substituteVariables(node.left, bindings),
                right: this.substituteVariables(node.right, bindings)
            };
        }
        if (node.type === "fraction") {
            // If numerator/denominator were parsed as variables (which our parser doesn't support for fraction type yet, 
            // except via the hack I added or if I change fraction definition).
            // Actually, my parser change allowed IDENTIFIER in denominator but returned it as fraction.
            // But `FractionNode` expects string num/den.
            // So `parseExpression` for `a/b` returns `binaryOp(/, var(a), var(b))` usually, 
            // UNLESS I explicitly handled it.
            // My parser change:
            // if (den.type === "IDENTIFIER") return { type: "fraction", numerator: token.value, denominator: den.value }
            // This puts "a" into denominator string.
            // So if we have a fraction node with variable names in strings?
            // That's messy.
            // Better: `resultPattern` "a/b" should be parsed as binaryOp if a,b are vars.
            // But `parseExpression` parses `1/2` as FractionNode.
            // If pattern is `a/c + b/c`, `c` is a variable.
            // `parseExpression` will parse `a/c` as binaryOp(/, a, c) because `c` is identifier.
            // `1/c` -> binaryOp(/, 1, c) (because I restricted fraction to number/number or number/identifier).
            // Wait, my parser change allowed `number / identifier` to be `fraction`.
            // So `1/c` is `fraction(1, "c")`.
            // `substituteVariables` needs to handle this.
            let num = node.numerator;
            let den = node.denominator;
            // Check if num/den are variable names
            if (bindings[num]) {
                const bound = bindings[num];
                if (bound.type === "integer")
                    num = bound.value;
                // What if bound is fraction? Nested fraction?
                // `FractionNode` only supports string num/den.
                // If bound is complex, we must convert this node to binaryOp(/).
            }
            if (bindings[den]) {
                const bound = bindings[den];
                if (bound.type === "integer")
                    den = bound.value;
            }
            return { ...node, numerator: num, denominator: den };
        }
        return node;
    }
    static applyPrimitive(root, target, id, path) {
        // Mixed Operations (Check specific IDs first to avoid P.INT_ prefix match)
        if (id === "P.INT_PLUS_FRAC" || id === "P.INT_MINUS_FRAC") {
            return this.runMixedOp(root, target, id, path);
        }
        // Integer Operations
        if (id.startsWith("P.INT_"))
            return this.runIntegerOp(root, target, id, path);
        // Fraction Operations
        if (id.startsWith("P.FRAC_"))
            return this.runFractionOp(root, target, id, path);
        // Decimal Operations
        if (id.startsWith("P.DEC_"))
            return this.runDecimalOp(root, target, id, path);
        // Structure/Other Operations
        switch (id) {
            case "P.PAREN_REMOVE":
            case "P.PAREN_REMOVE_NESTED":
            case "P.FRAC_DEN_PAREN_REMOVE":
                // Since our parser/printer handles parens automatically based on precedence,
                // "removing" them is just a no-op identity transform (re-print).
                return root;
            case "P.DISTRIBUTE_NEG":
            case "P.DISTRIBUTE_NEG_SUB":
                return this.runDistributeNeg(root, target, id, path);
            case "P.NEG_NEG_TO_POS":
                return this.runDoubleNeg(root, target, path);
            case "P.ADD_ZERO_LEFT":
            case "P.ADD_ZERO_RIGHT":
            case "P.SUB_ZERO":
                return this.runIdentityAddSub(root, target, id, path);
            case "P.SUB_SELF":
                return replaceNodeAt(root, path, { type: "integer", value: "0" });
            case "P.MUL_ZERO_LEFT":
            case "P.MUL_ZERO_RIGHT":
            case "P.DIV_ZERO_NUM":
                return replaceNodeAt(root, path, { type: "integer", value: "0" });
            case "P.DIV_ZERO_DEN_ERROR":
                throw new Error("division-by-zero");
            case "P.MUL_ONE_LEFT":
            case "P.MUL_ONE_RIGHT":
            case "P.MUL_ONE_LEFT_FRAC":
            case "P.MUL_ONE_RIGHT_FRAC":
            case "P.DIV_ONE":
            case "P.FRAC_DEN_ONE":
                return this.runIdentityMulDiv(root, target, id, path);
            case "P.DIV_INV":
                // 1 / x -> 1/x
                // If target is binaryOp /, replace with Fraction
                if (target?.type === "binaryOp" && target.op === "/") {
                    return replaceNodeAt(root, path, {
                        type: "fraction",
                        numerator: toLatex(target.left),
                        denominator: toLatex(target.right)
                    });
                }
                return undefined;
            case "P.FRAC_NUM_DEN_EQUAL":
                return replaceNodeAt(root, path, { type: "integer", value: "1" });
            case "P.MIXED_SPLIT":
                if (target?.type === "mixed") {
                    // A B/C -> A + B/C
                    return replaceNodeAt(root, path, {
                        type: "binaryOp",
                        op: "+",
                        left: { type: "integer", value: target.whole },
                        right: { type: "fraction", numerator: target.numerator, denominator: target.denominator }
                    });
                }
                return undefined;
            case "P.MUL_BY_ONE":
                // x -> x * 1
                if (!target)
                    return undefined;
                return replaceNodeAt(root, path, {
                    type: "binaryOp",
                    op: "*",
                    left: target,
                    right: { type: "integer", value: "1" }
                });
            case "P.ONE_TO_FRAC":
                // 1 -> n/n. Need to guess n.
                // We'll look for another fraction in the root to guess denominator.
                // This is a heuristic for the stub.
                const den = this.findContextDenominator(root) || "1";
                return replaceNodeAt(root, path, {
                    type: "fraction",
                    numerator: den,
                    denominator: den
                });
            case "P.INT_TO_FRAC_IN_SUM":
            case "P.INT_TO_FRAC_IN_SUB":
                // n -> n/1
                if (target?.type === "integer") {
                    return replaceNodeAt(root, path, {
                        type: "fraction",
                        numerator: target.value,
                        denominator: "1"
                    });
                }
                return undefined;
        }
        // Mixed Operations
        if (id === "P.INT_PLUS_FRAC" || id === "P.INT_MINUS_FRAC") {
            return this.runMixedOp(root, target, id, path);
        }
        return undefined;
    }
    static runMixedOp(root, target, id, path) {
        if (target?.type !== "binaryOp")
            return undefined;
        // Case 1: Integer + Fraction (a + b/c)
        if (target.left.type === "integer" && target.right.type === "fraction") {
            const a = parseInt(target.left.value, 10);
            const b = parseInt(target.right.numerator, 10);
            const c = parseInt(target.right.denominator, 10);
            if (id === "P.INT_PLUS_FRAC") {
                // a + b/c -> (a*c + b)/c
                return replaceNodeAt(root, path, {
                    type: "fraction",
                    numerator: (a * c + b).toString(),
                    denominator: c.toString()
                });
            }
            if (id === "P.INT_MINUS_FRAC") {
                // a - b/c -> (a*c - b)/c
                return replaceNodeAt(root, path, {
                    type: "fraction",
                    numerator: (a * c - b).toString(),
                    denominator: c.toString()
                });
            }
        }
        // Case 2: Fraction + Integer (b/c + a)
        if (target.left.type === "fraction" && target.right.type === "integer") {
            const b = parseInt(target.left.numerator, 10);
            const c = parseInt(target.left.denominator, 10);
            const a = parseInt(target.right.value, 10);
            if (id === "P.INT_PLUS_FRAC") {
                // b/c + a -> (b + a*c)/c
                return replaceNodeAt(root, path, {
                    type: "fraction",
                    numerator: (b + a * c).toString(),
                    denominator: c.toString()
                });
            }
        }
        return undefined;
    }
    static runIntegerOp(root, target, id, path) {
        let a, b;
        // Handle Fraction as Division
        if (target?.type === "fraction" && (id === "P.INT_DIV_EXACT" || id === "P.INT_DIV_TO_FRAC")) {
            a = parseInt(target.numerator, 10);
            b = parseInt(target.denominator, 10);
        }
        else {
            if (target?.type !== "binaryOp")
                return undefined;
            if (target.left.type !== "integer" || target.right.type !== "integer")
                return undefined;
            a = parseInt(target.left.value, 10);
            b = parseInt(target.right.value, 10);
        }
        let res = null;
        switch (id) {
            case "P.INT_ADD":
                res = a + b;
                break;
            case "P.INT_SUB":
                res = a - b;
                break;
            case "P.INT_MUL":
                res = a * b;
                break;
            case "P.INT_DIV_EXACT":
                if (b === 0)
                    throw new Error("division-by-zero");
                if (a % b !== 0)
                    return undefined; // Not exact
                res = a / b;
                break;
            case "P.INT_DIV_TO_FRAC":
                if (b === 0)
                    throw new Error("division-by-zero");
                return replaceNodeAt(root, path, {
                    type: "fraction",
                    numerator: a.toString(),
                    denominator: b.toString()
                });
        }
        if (res !== null) {
            return replaceNodeAt(root, path, { type: "integer", value: res.toString() });
        }
        return undefined;
    }
    static runFractionOp(root, target, id, path) {
        if (id === "P.FRAC_SIMPLIFY_BASIC" || id === "P0.FRAC_SIMPLIFY") {
            if (target?.type !== "fraction")
                return undefined;
            const n = parseInt(target.numerator, 10);
            const d = parseInt(target.denominator, 10);
            const common = this.gcd(n, d);
            return replaceNodeAt(root, path, {
                type: "fraction",
                numerator: (n / common).toString(),
                denominator: (d / common).toString()
            });
        }
        if (id === "P.FRAC_WHOLE_TO_OVER_ONE") {
            if (target?.type !== "integer")
                return undefined;
            return replaceNodeAt(root, path, {
                type: "fraction",
                numerator: target.value,
                denominator: "1"
            });
        }
        if (id === "P.FRAC_NEG_NUM" || id === "P.FRAC_MOVE_NEG_DEN") {
            // Move negative sign. 
            // -a/b -> (-a)/b or a/-b -> -a/b
            // This requires parsing the sign which might be in the value string or implicit.
            // Our parser keeps "-" in the value for integers?
            // Let's assume values can be "-5".
            if (target?.type !== "fraction")
                return undefined;
            // Implementation depends on where the sign is.
            // For now, let's skip complex sign logic unless we see it failing.
            return root; // No-op for now
        }
        if (target?.type !== "binaryOp")
            return undefined;
        if (target.left.type !== "fraction" || target.right.type !== "fraction")
            return undefined;
        const n1 = parseInt(target.left.numerator, 10);
        const d1 = parseInt(target.left.denominator, 10);
        const n2 = parseInt(target.right.numerator, 10);
        const d2 = parseInt(target.right.denominator, 10);
        let newFrac = null;
        switch (id) {
            case "P.FRAC_ADD_SAME":
            case "P.FRAC_ADD_SAME_DEN":
                if (d1 !== d2)
                    return undefined;
                newFrac = { n: n1 + n2, d: d1 };
                break;
            case "P.FRAC_SUB_SAME":
            case "P.FRAC_SUB_SAME_DEN":
                if (d1 !== d2)
                    return undefined;
                newFrac = { n: n1 - n2, d: d1 };
                break;
            case "P.FRAC_MUL":
                newFrac = { n: n1 * n2, d: d1 * d2 };
                break;
            case "P.FRAC_DIV":
                if (n2 === 0)
                    throw new Error("division-by-zero");
                newFrac = { n: n1 * d2, d: d1 * n2 };
                break;
            case "P.FRAC_ADD_DIFF":
            case "P4.FRAC_ADD_BASIC":
                if (d1 === d2) {
                    newFrac = { n: n1 + n2, d: d1 };
                }
                else {
                    newFrac = { n: n1 * d2 + n2 * d1, d: d1 * d2 };
                }
                break;
            case "P4.FRAC_SUB_BASIC":
                if (d1 === d2) {
                    newFrac = { n: n1 - n2, d: d1 };
                }
                else {
                    newFrac = { n: n1 * d2 - n2 * d1, d: d1 * d2 };
                }
                break;
        }
        if (newFrac) {
            return replaceNodeAt(root, path, {
                type: "fraction",
                numerator: newFrac.n.toString(),
                denominator: newFrac.d.toString()
            });
        }
        return undefined;
    }
    static runDecimalOp(root, target, id, path) {
        if (target?.type !== "binaryOp")
            return undefined;
        // Decimals are parsed as integers/numbers in our AST currently (value contains ".")
        if (target.left.type !== "integer" || target.right.type !== "integer")
            return undefined;
        const a = parseFloat(target.left.value);
        const b = parseFloat(target.right.value);
        let res = null;
        switch (id) {
            case "P.DEC_ADD":
                res = a + b;
                break;
            case "P.DEC_SUB":
                res = a - b;
                break;
            case "P.DEC_MUL":
                res = a * b;
                break;
            case "P.DEC_DIV":
                if (b === 0)
                    throw new Error("division-by-zero");
                res = a / b;
                break;
        }
        if (res !== null) {
            // Format to avoid long floats?
            // For now, simple toString
            return replaceNodeAt(root, path, { type: "integer", value: res.toString() });
        }
        return undefined;
    }
    static runIdentityAddSub(root, target, id, path) {
        if (target?.type !== "binaryOp")
            return undefined;
        // x + 0 -> x
        if (id === "P.ADD_ZERO_RIGHT" || id === "P.SUB_ZERO") {
            return replaceNodeAt(root, path, target.left);
        }
        // 0 + x -> x
        if (id === "P.ADD_ZERO_LEFT") {
            return replaceNodeAt(root, path, target.right);
        }
        return undefined;
    }
    static runIdentityMulDiv(root, target, id, path) {
        if (target?.type !== "binaryOp")
            return undefined;
        // x * 1 -> x, x / 1 -> x
        if (id === "P.MUL_ONE_RIGHT" || id === "P.DIV_ONE" || id === "P.MUL_ONE_RIGHT_FRAC" || id === "P.FRAC_DEN_ONE") {
            return replaceNodeAt(root, path, target.left);
        }
        // 1 * x -> x
        if (id === "P.MUL_ONE_LEFT" || id === "P.MUL_ONE_LEFT_FRAC") {
            return replaceNodeAt(root, path, target.right);
        }
        return undefined;
    }
    static runDistributeNeg(root, target, id, path) {
        // - (a + b) -> -a - b
        // This requires structure matching: UnaryOp?
        // Our parser treats "-x" as... wait.
        // Our parser handles binary ops. Unary minus is usually parsed as part of the number OR as 0 - x?
        // Or maybe we need a UnaryOp node?
        // The current parser in `ast.ts` does NOT support UnaryOp explicitly.
        // It likely parses `- (a+b)` as `0 - (a+b)` or fails?
        // Actually, `parseAddSub` handles `+` and `-` as binary.
        // If it starts with `-`, `parseMulDiv` is called.
        // `parsePrimary` handles numbers and parens.
        // If input is `-5`, `tokenize` sees `-` then `5`.
        // `parseExpression` calls `parseAddSub`.
        // `parseAddSub` calls `parseMulDiv`.
        // `parseMulDiv` calls `parsePrimary`.
        // `parsePrimary` expects NUMBER or LPAREN.
        // It does NOT handle leading `-`.
        // So `-5` fails to parse!
        // CRITICAL: Parser doesn't support unary minus.
        // However, for `P.DISTRIBUTE_NEG`, we usually have `a - (b + c)`.
        // In that case, `target` is the subtraction node `a - ...`.
        // And `right` is `(b + c)`.
        // So we transform `a - (b + c)` to `a - b - c`.
        if (target?.type !== "binaryOp")
            return undefined;
        if (id === "P.DISTRIBUTE_NEG") {
            // a - (b + c) -> a - b - c
            // target is the MINUS op.
            // right is the PLUS op (in parens).
            if (target.op === "-" && target.right.type === "binaryOp" && target.right.op === "+") {
                const b = target.right.left;
                const c = target.right.right;
                // Construct a - b - c
                return replaceNodeAt(root, path, {
                    type: "binaryOp",
                    op: "-",
                    left: {
                        type: "binaryOp",
                        op: "-",
                        left: target.left,
                        right: b
                    },
                    right: c
                });
            }
        }
        if (id === "P.DISTRIBUTE_NEG_SUB") {
            // a - (b - c) -> a - b + c
            if (target.op === "-" && target.right.type === "binaryOp" && target.right.op === "-") {
                const b = target.right.left;
                const c = target.right.right;
                // Construct a - b + c
                return replaceNodeAt(root, path, {
                    type: "binaryOp",
                    op: "+",
                    left: {
                        type: "binaryOp",
                        op: "-",
                        left: target.left,
                        right: b
                    },
                    right: c
                });
            }
        }
        return undefined;
    }
    static runDoubleNeg(root, target, path) {
        // a - (-b) -> a + b
        // Again, relies on how -b is represented.
        // If -b is `0 - b` or `(-1)*b`?
        // Or if it's just a negative number?
        // If target is `a - (-5)`, right is integer -5.
        // Then `a + 5`.
        if (target?.type === "binaryOp" && target.op === "-") {
            if (target.right.type === "integer" && target.right.value.startsWith("-")) {
                const val = target.right.value.substring(1); // remove -
                return replaceNodeAt(root, path, {
                    type: "binaryOp",
                    op: "+",
                    left: target.left,
                    right: { type: "integer", value: val }
                });
            }
        }
        return undefined;
    }
    static gcd(a, b) {
        return b === 0 ? a : this.gcd(b, a % b);
    }
    static findContextDenominator(node) {
        if (node.type === "fraction") {
            if (node.denominator !== "1")
                return node.denominator;
            return null; // Skip "1"
        }
        if (node.type === "binaryOp") {
            // Try right first? Or both?
            // DFS
            const left = this.findContextDenominator(node.left);
            if (left)
                return left;
            return this.findContextDenominator(node.right);
        }
        return null;
    }
}
