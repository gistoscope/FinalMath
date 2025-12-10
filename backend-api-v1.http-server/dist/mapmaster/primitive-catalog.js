/**
 * primitive-catalog.ts
 *
 * Central catalog of atomic primitives, mirroring the structure of primitives (5).html.
 * Used to select primitives based on the click context (operator, operand types, etc.).
 */
import { getNodeAt } from "./ast";
/**
 * The Central Primitive Catalog (Stage 1).
 * Matches rows in primitives (5).html.
 */
export const primitiveCatalog = [
    // --- A. Integers ---
    {
        op: "+",
        lhsKind: ["int", "one", "zero"],
        rhsKind: ["int", "one", "zero"],
        primitiveId: "P.INT_ADD",
        description: "Integer Addition",
        operationType: "add",
        domainClass: "int-int",
        stage: "stage1"
    },
    {
        op: "-",
        lhsKind: ["int", "one", "zero"],
        rhsKind: ["int", "one", "zero"],
        primitiveId: "P.INT_SUB",
        description: "Integer Subtraction",
        operationType: "sub",
        domainClass: "int-int",
        stage: "stage1"
    },
    {
        op: "*",
        lhsKind: ["int", "one", "zero"],
        rhsKind: ["int", "one", "zero"],
        primitiveId: "P.INT_MUL",
        description: "Integer Multiplication",
        operationType: "mul",
        domainClass: "int-int",
        stage: "stage1"
    },
    {
        op: "/",
        lhsKind: ["int", "one", "zero"],
        rhsKind: ["int", "one", "zero"],
        primitiveId: "P.INT_DIV_TO_INT", // Was P.INT_DIV_EXACT
        description: "Integer Division (Exact)",
        operationType: "div",
        domainClass: "int-int",
        stage: "stage1"
    },
    {
        op: "/",
        lhsKind: ["int", "one", "zero"],
        rhsKind: ["int", "one", "zero"],
        primitiveId: "P.INT_DIV_TO_FRAC",
        description: "Integer Division (To Fraction)",
        operationType: "div",
        domainClass: "int-int",
        stage: "stage1",
        priority: -1 // Lower priority than exact
    },
    // --- B. Fractions ---
    {
        op: "+",
        lhsKind: "frac",
        rhsKind: "frac",
        sameDenominator: true,
        primitiveId: "P.FRAC_ADD_SAME_DEN",
        description: "Fraction Add (Same Denominator)",
        operationType: "add",
        domainClass: "frac-same-den",
        stage: "stage1"
    },
    {
        op: "-",
        lhsKind: "frac",
        rhsKind: "frac",
        sameDenominator: true,
        primitiveId: "P.FRAC_SUB_SAME_DEN",
        description: "Fraction Sub (Same Denominator)",
        operationType: "sub",
        domainClass: "frac-same-den",
        stage: "stage1"
    },
    {
        op: "*",
        lhsKind: "frac",
        rhsKind: "frac",
        primitiveId: "P.FRAC_MUL",
        description: "Fraction Multiplication",
        operationType: "mul",
        domainClass: "frac-diff-den",
        stage: "stage1"
    },
    {
        op: "/",
        lhsKind: "frac",
        rhsKind: "frac",
        primitiveId: "P.FRAC_DIV_AS_MUL", // Was P.FRAC_DIV
        description: "Fraction Division",
        operationType: "div",
        domainClass: "frac-diff-den",
        stage: "stage1"
    },
    // --- C. Decimals ---
    // Removed: Not in V5 registry
    // --- D. Mixed / Interop ---
    // Removed: Not in V5 registry
    // --- F. Zero Operations ---
    // P.ADD_ZERO_LEFT
    // P.ADD_ZERO_RIGHT
    // P.SUB_ZERO (Removed: Not in V5 registry)
    // P.MUL_ZERO_LEFT
    // P.MUL_ZERO_RIGHT
    // --- G. Identity Operations ---
    // P.MUL_ONE_LEFT
    // P.MUL_ONE_RIGHT
    // P.DIV_ONE (Removed: Not in V5 registry)
];
/**
 * Select matching primitives for a given context.
 */
export function selectPrimitivesForClick(ctx) {
    return primitiveCatalog.filter(entry => {
        // 1. Op Match
        if (entry.op !== ctx.op) {
            return false;
        }
        // 2. LHS Match
        if (!matchKind(entry.lhsKind, ctx.lhsKind)) {
            return false;
        }
        // 3. RHS Match
        if (!matchKind(entry.rhsKind, ctx.rhsKind)) {
            return false;
        }
        // 4. Extra Conditions
        if (entry.sameDenominator !== undefined && entry.sameDenominator !== ctx.sameDenominator) {
            return false;
        }
        if (entry.hasZero !== undefined && entry.hasZero !== ctx.hasZero)
            return false;
        if (entry.hasOne !== undefined && entry.hasOne !== ctx.hasOne)
            return false;
        if (entry.hasParens !== undefined && entry.hasParens !== ctx.hasParens)
            return false;
        return true;
    });
}
function matchKind(entryKind, ctxKind) {
    if (Array.isArray(entryKind)) {
        return entryKind.includes(ctxKind) || entryKind.includes("other"); // "other" is wildcard-ish for non-special
    }
    if (entryKind === "other") {
        return ctxKind !== "none";
    }
    return entryKind === ctxKind;
}
/**
 * Build ClickContext from AST and selection.
 */
export function buildClickContext(ast, selectionPath) {
    const node = findNodeAt(ast, selectionPath);
    if (!node)
        return null;
    let op = "unknown";
    let lhs;
    let rhs;
    if (node.type === "binaryOp") {
        op = node.op;
        lhs = node.left;
        rhs = node.right;
    }
    else if (node.type === "fraction") {
        // Clicking the fraction bar? Treat as division?
        // For now, let's return null for catalog matching on fraction nodes directly.
        return null;
    }
    else {
        return null;
    }
    const lhsKind = classifyOperand(lhs);
    const rhsKind = classifyOperand(rhs);
    let sameDenominator = false;
    if (lhsKind === "frac" && rhsKind === "frac" && lhs && rhs) {
        if (lhs.type === "fraction" && rhs.type === "fraction") {
            sameDenominator = lhs.denominator === rhs.denominator;
        }
    }
    return {
        op,
        lhsKind,
        rhsKind,
        sameDenominator,
        hasZero: lhsKind === "zero" || rhsKind === "zero",
        hasOne: lhsKind === "one" || rhsKind === "one",
    };
}
function classifyOperand(node) {
    if (!node)
        return "none";
    if (node.type === "integer") {
        if (node.value === "0")
            return "zero";
        if (node.value === "1")
            return "one";
        return "int";
    }
    if (node.type === "fraction") {
        return "frac";
    }
    if (node.type === "mixed") {
        return "mixed";
    }
    return "other";
}
function findNodeAt(root, path) {
    return getNodeAt(root, path);
}
