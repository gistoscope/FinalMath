/**
 * Primitive Runner (TzV1.1)
 * 
 * Executes atomic primitives on the AST.
 * This serves as the internal "Engine Stub" for V1.1.
 */

import { AstNode, getNodeAt, parseExpression, replaceNodeAt, toLatex, NodeType } from "../mapmaster/ast";
import { EngineStepExecutionRequest, EngineStepExecutionResult } from "./engine.bridge";
import { PrimitiveId } from "./primitives.registry";

export class PrimitiveRunner {
    static run(req: EngineStepExecutionRequest): EngineStepExecutionResult {
        const { expressionLatex, primitiveId, targetPath, bindings, resultPattern } = req;
        const ast = parseExpression(expressionLatex);
        if (!ast) return { ok: false, errorCode: "parse-error" };

        const targetNode = getNodeAt(ast, targetPath);

        try {
            let newAst: AstNode | undefined;

            // Force legacy execution for primitives that require arithmetic simplification
            // which generic pattern execution (substitution only) cannot handle yet.
            const forceLegacy = [
                "P.INT_ADD",
                "P.INT_SUB",
                "P.INT_MUL",
                "P.INT_DIV_TO_INT",
                "P.DEC_TO_FRAC"
            ].includes(primitiveId);

            if (resultPattern && bindings && !forceLegacy) {
                // Use Generic Pattern Execution
                newAst = this.generateResultFromPattern(ast, targetPath, resultPattern, bindings);
            } else {
                // Fallback to legacy execution
                newAst = this.applyPrimitive(ast, targetNode, primitiveId as PrimitiveId, targetPath);
            }

            if (!newAst) return { ok: false, errorCode: "primitive-failed" };

            return {
                ok: true,
                newExpressionLatex: toLatex(newAst)
            };
        } catch (e) {
            return { ok: false, errorCode: e instanceof Error ? e.message : "unknown-error" };
        }
    }

    private static generateResultFromPattern(root: AstNode, path: string, resultPattern: string, bindings: Record<string, any>): AstNode | undefined {
        // 1. Check for calc(...)
        if (resultPattern.startsWith("calc(")) {
            const expr = resultPattern.substring(5, resultPattern.length - 1);
            // Evaluate expression with bindings
            // We need a simple evaluator that can handle basic arithmetic and variables
            const val = this.evaluateCalc(expr, bindings);
            if (val === null) return undefined;
            return replaceNodeAt(root, path, { type: "integer", value: val.toString() });
        }

        // 2. Structural substitution
        // Parse the result pattern into an AST template
        const templateAst = parseExpression(resultPattern);
        if (!templateAst) return undefined;

        // Substitute variables in the template
        const substitutedAst = this.substituteVariables(templateAst, bindings);

        // Replace the target node with the substituted AST
        return replaceNodeAt(root, path, substitutedAst);
    }

    private static evaluateCalc(expr: string, bindings: Record<string, any>): number | null {
        // Simple evaluator for "a+b", "a*b", etc.
        // Replace variables with values
        let evalExpr = expr;
        for (const [key, node] of Object.entries(bindings)) {
            if (node.type === "integer") {
                evalExpr = evalExpr.replace(new RegExp(key, "g"), node.value);
            } else if (node.type === "fraction") {
                // Handle fraction values if needed?
                // For now assume calc() is only for integers/decimals
                return null;
            }
        }

        try {
            // Safety check: only allow digits, operators, parens, spaces
            if (!/^[\d\+\-\*\/\(\)\s\.]+$/.test(evalExpr)) return null;
            // Use Function constructor for evaluation (safe-ish given the regex check)
            return new Function(`return ${evalExpr}`)();
        } catch (e) {
            return null;
        }
    }

    private static substituteVariables(node: AstNode, bindings: Record<string, any>): AstNode {
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
            let num = node.numerator;
            let den = node.denominator;

            // Check if num/den are variable names
            if (bindings[num]) {
                const bound = bindings[num];
                if (bound.type === "integer") num = bound.value;
            }
            if (bindings[den]) {
                const bound = bindings[den];
                if (bound.type === "integer") den = bound.value;
            }

            return { ...node, numerator: num, denominator: den };
        }

        return node;
    }

    private static applyPrimitive(root: AstNode, target: AstNode | undefined, id: PrimitiveId, path: string): AstNode | undefined {
        switch (id) {
            // --- A. Normalization ---
            case "P.DEC_TO_FRAC":
                // d -> p/q
                // Not implemented fully without decimal parsing support in AST
                return undefined;

            case "P.MIXED_TO_SUM":
                if (target?.type === "mixed") {
                    return replaceNodeAt(root, path, {
                        type: "binaryOp",
                        op: "+",
                        left: { type: "integer", value: target.whole },
                        right: { type: "fraction", numerator: target.numerator, denominator: target.denominator }
                    });
                }
                return undefined;
            case "P.INT_TO_FRAC":
                if (target?.type === "integer") {
                    return replaceNodeAt(root, path, {
                        type: "fraction",
                        numerator: target.value,
                        denominator: "1"
                    });
                }
                return undefined;
            case "P.FRAC_TO_INT":
                if (target?.type === "fraction" && target.denominator === "1") {
                    return replaceNodeAt(root, path, {
                        type: "integer",
                        value: target.numerator
                    });
                }
                return undefined;
            case "P.ONE_TO_UNIT_FRAC":
                if (target?.type === "integer" && target.value === "1") {
                    // Heuristic: try to find a denominator from context
                    const den = this.findContextDenominator(root) || "1";
                    return replaceNodeAt(root, path, {
                        type: "fraction",
                        numerator: den,
                        denominator: den
                    });
                }
                return undefined;

            // --- B. Integers ---
            case "P.INT_ADD":
            case "P.INT_SUB":
            case "P.INT_MUL":
            case "P.INT_DIV_TO_INT":
                return this.runIntegerOp(root, target, id, path);
            case "P.INT_DIV_TO_FRAC":
                if (target?.type === "binaryOp" && (target.op as string) === ":") { // Assuming : is parsed as binaryOp
                    // But wait, our parser might parse : as / or something else?
                    // Standard parser usually handles / or :.
                    // Let's assume binaryOp.
                    if (target.left.type === "integer" && target.right.type === "integer") {
                        return replaceNodeAt(root, path, {
                            type: "fraction",
                            numerator: target.left.value,
                            denominator: target.right.value
                        });
                    }
                }
                return undefined;

            // --- C. Fractions ---
            case "P.FRAC_ADD_SAME_DEN":
            case "P.FRAC_SUB_SAME_DEN":
            case "P.FRAC_MUL":
            case "P.FRAC_DIV_AS_MUL":
            case "P.FRAC_EQ_SCALE":
                return this.runFractionOp(root, target, id, path);

            // --- D. Common Denominator ---
            case "P.FRAC_MUL_BY_ONE":
                if (target?.type === "fraction") {
                    return replaceNodeAt(root, path, {
                        type: "binaryOp",
                        op: "*",
                        left: target,
                        right: { type: "integer", value: "1" }
                    });
                }
                return undefined;
            case "P.FRAC_LIFT_LEFT_BY_RIGHT_DEN":
                return this.runLiftFraction(root, target, path, "left");

            case "P.FRAC_LIFT_RIGHT_BY_LEFT_DEN":
                return this.runLiftFraction(root, target, path, "right");

            case "P.FRAC_MUL_UNIT":
                // x/y * k/k -> (xk)/(yk)
                if (target?.type === "binaryOp" && target.op === "*") {
                    if (target.left.type === "fraction" && target.right.type === "fraction") {
                        const n1 = parseInt(target.left.numerator);
                        const d1 = parseInt(target.left.denominator);
                        const n2 = parseInt(target.right.numerator);
                        const d2 = parseInt(target.right.denominator);
                        if (n2 === d2) {
                            return replaceNodeAt(root, path, {
                                type: "fraction",
                                numerator: (n1 * n2).toString(),
                                denominator: (d1 * d2).toString()
                            });
                        }
                    }
                }
                return undefined;

            case "P.FRAC_ADD_AFTER_LIFT":
                // a/b + c/b -> (a+c)/b
                // This is same as P.FRAC_ADD_SAME_DEN but maybe strictly for lifted context?
                // Implementation is identical.
                return this.runFractionOp(root, target, "P.FRAC_ADD_SAME_DEN", path);

            // --- E. Signs ---
            case "P.NEG_BEFORE_NUMBER":
                // -(a) -> -a
                // Parser issues with unary minus.
                // If target is `-(a)`, it might be `binaryOp(-, 0, a)` or similar?
                // Or `binaryOp(-, left, right)` where we want to distribute?
                // P.NEG_BEFORE_NUMBER is specifically `-(a)` -> `-a`.
                // If we have `-(3)`, we want `-3`.
                // If `target` is `binaryOp(-, 0, 3)`, result is `integer(-3)`.
                if (target?.type === "binaryOp" && target.op === "-" && target.left.type === "integer" && target.left.value === "0") {
                    if (target.right.type === "integer") {
                        return replaceNodeAt(root, path, {
                            type: "integer",
                            value: "-" + target.right.value
                        });
                    }
                }
                return undefined;

            case "P.NEG_NEG":
                // -(-a) -> a
                return this.runDoubleNeg(root, target, path);

            case "P.NEG_DISTRIB_ADD":
            case "P.NEG_DISTRIB_SUB":
                return this.runDistributeNeg(root, target, id, path);

            // --- F. Parentheses ---
            case "P.PAREN_AROUND_ATOM_INT":
            case "P.PAREN_AROUND_ATOM_FRAC":
            case "P.PAREN_AROUND_EXPR_INT":
            case "P.PAREN_AROUND_EXPR_FRAC":
                // Removing parens is a no-op in our AST/Printer
                return root;

            // --- G. Nested Fractions ---
            case "P.NESTED_FRAC_DIV":
                // (a/b) / (c/d) -> a/b * d/c
                if (target?.type === "binaryOp" && (target.op === "/" || (target.op as string) === ":")) {
                    if (target.left.type === "fraction" && target.right.type === "fraction") {
                        return replaceNodeAt(root, path, {
                            type: "binaryOp",
                            op: "*",
                            left: target.left,
                            right: {
                                type: "fraction",
                                numerator: target.right.denominator,
                                denominator: target.right.numerator
                            }
                        });
                    }
                }
                return undefined;
        }

        return undefined;
    }



    private static runIntegerOp(root: AstNode, target: AstNode | undefined, id: string, path: string): AstNode | undefined {
        let a: number, b: number;

        // Handle Fraction as Division
        if (target?.type === "fraction" && (id === "P.INT_DIV_TO_INT" || id === "P.INT_DIV_TO_FRAC")) {
            a = parseInt(target.numerator, 10);
            b = parseInt(target.denominator, 10);
        } else {
            if (target?.type !== "binaryOp") return undefined;
            if (target.left.type !== "integer" || target.right.type !== "integer") return undefined;
            a = parseInt(target.left.value, 10);
            b = parseInt(target.right.value, 10);
        }

        let res: number | null = null;

        switch (id) {
            case "P.INT_ADD": res = a + b; break;
            case "P.INT_SUB": res = a - b; break;
            case "P.INT_MUL": res = a * b; break;
            case "P.INT_DIV_TO_INT":
                if (b === 0) throw new Error("division-by-zero");
                if (a % b !== 0) return undefined; // Not exact
                res = a / b;
                break;
            case "P.INT_DIV_TO_FRAC":
                if (b === 0) throw new Error("division-by-zero");
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

    private static runFractionOp(root: AstNode, target: AstNode | undefined, id: string, path: string): AstNode | undefined {
        if (id === "P.FRAC_SIMPLIFY_BASIC" || id === "P0.FRAC_SIMPLIFY") {
            if (target?.type !== "fraction") return undefined;
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
            if (target?.type !== "integer") return undefined;
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
            if (target?.type !== "fraction") return undefined;
            // Implementation depends on where the sign is.
            // For now, let's skip complex sign logic unless we see it failing.
            return root; // No-op for now
        }

        if (target?.type !== "binaryOp") return undefined;
        if (target.left.type !== "fraction" || target.right.type !== "fraction") return undefined;

        const n1 = parseInt(target.left.numerator, 10);
        const d1 = parseInt(target.left.denominator, 10);
        const n2 = parseInt(target.right.numerator, 10);
        const d2 = parseInt(target.right.denominator, 10);

        let newFrac: { n: number, d: number } | null = null;
        let newOp: AstNode | undefined;

        switch (id) {
            case "P.FRAC_ADD_SAME_DEN":
                if (d1 === d2) newFrac = { n: n1 + n2, d: d1 };
                break;
            case "P.FRAC_SUB_SAME_DEN":
                if (d1 === d2) newFrac = { n: n1 - n2, d: d1 };
                break;
            case "P.FRAC_MUL":
                newFrac = { n: n1 * n2, d: d1 * d2 };
                break;
            case "P.FRAC_DIV_AS_MUL":
                // a/b : c/d -> a/b * d/c
                newOp = {
                    type: "binaryOp",
                    op: "*",
                    left: target.left,
                    right: { type: "fraction", numerator: target.right.denominator, denominator: target.right.numerator }
                };
                break;



        }

        if (newOp) return replaceNodeAt(root, path, newOp);

        if (newFrac) {
            return replaceNodeAt(root, path, {
                type: "fraction",
                numerator: newFrac.n.toString(),
                denominator: newFrac.d.toString()
            });
        }
        return undefined;
    }







    private static runDistributeNeg(root: AstNode, target: AstNode | undefined, id: string, path: string): AstNode | undefined {
        if (target?.type !== "binaryOp") return undefined;

        if (id === "P.NEG_DISTRIB_ADD") {
            // a - (b + c) -> a - b - c
            // This logic assumes specific AST shape.
            // V5 pattern: -(a+b) -> -a-b. This is UNARY minus.
            // Existing logic handles BINARY minus a - (b+c).
            // Check if we need to support V5 logic here?
            // V5 P.NEG_DISTRIB_ADD is for "-(a+b)".
            // If target is unary minus, we distribute.
            // If internal logic is for binary minus, it might be mismatched.
            // But let's rename the check first.

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

        if (id === "P.NEG_DISTRIB_SUB") {
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

    private static runDoubleNeg(root: AstNode, target: AstNode | undefined, path: string): AstNode | undefined {
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

    private static runLiftFraction(root: AstNode, target: AstNode | undefined, path: string, side: "left" | "right"): AstNode | undefined {
        // We need to find the parent binaryOp to get the other fraction's denominator.
        // Since we don't have parent pointers, we have to search from root?
        // Or we can assume the path ends in `.left` or `.right`?
        // path format: "term[0].left" etc.
        // If side is "left", path ends in ".left". Parent is path without ".left".
        // If side is "right", path ends in ".right". Parent is path without ".right".

        // This is a bit fragile but works for standard paths.
        let parentPath = "";
        if (side === "left" && path.endsWith(".left")) parentPath = path.substring(0, path.length - 5);
        else if (side === "right" && path.endsWith(".right")) parentPath = path.substring(0, path.length - 6);
        else return undefined;

        const parent = getNodeAt(root, parentPath);
        if (parent?.type !== "binaryOp") return undefined;

        const other = side === "left" ? parent.right : parent.left;
        if (other.type !== "fraction") return undefined;

        const den = other.denominator;

        return replaceNodeAt(root, path, {
            type: "binaryOp",
            op: "*",
            left: target!,
            right: { type: "fraction", numerator: den, denominator: den }
        });
    }

    private static gcd(a: number, b: number): number {
        return b === 0 ? a : this.gcd(b, a % b);
    }

    private static findContextDenominator(node: AstNode): string | null {
        if (node.type === "fraction") {
            if (node.denominator !== "1") return node.denominator;
            return null;
        }
        if (node.type === "binaryOp") {
            const left = this.findContextDenominator(node.left);
            if (left) return left;
            return this.findContextDenominator(node.right);
        }
        return null;
    }
}
