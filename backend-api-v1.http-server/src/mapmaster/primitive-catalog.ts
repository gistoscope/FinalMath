/**
 * primitive-catalog.ts
 *
 * Central catalog of atomic primitives, mirroring the structure of invariants39.html.
 * Used to select primitives based on the click context (operator, operand types, etc.).
 */

import { AstNode, NodeType } from "./ast";

export type OpKind = "+" | "-" | "*" | "/" | "neg" | "root" | "unknown";
export type OperandKind = "int" | "frac" | "decimal" | "mixed" | "zero" | "one" | "other" | "none";

export interface ClickContext {
    op: OpKind;
    lhsKind: OperandKind;
    rhsKind: OperandKind;

    // Extra conditions
    sameDenominator?: boolean;
    hasZero?: boolean;
    hasOne?: boolean;
    hasParens?: boolean;

    // For debugging/tracing
    description?: string;
}

export interface PrimitiveCatalogEntry {
    // Primary keys
    op: OpKind;
    lhsKind: OperandKind | OperandKind[]; // Can match multiple kinds
    rhsKind: OperandKind | OperandKind[];

    // Conditions
    sameDenominator?: boolean;
    hasZero?: boolean;
    hasOne?: boolean;
    hasParens?: boolean;

    // Result
    primitiveId: string;

    // Metadata
    description: string;
    priority?: number; // Higher wins

    // Systemic Classification (Stage-1)
    operationType?: "add" | "sub" | "mul" | "div";
    domainClass?: "int-int" | "frac-same-den" | "frac-diff-den" | "int-plus-frac" | "dec-dec" | "other";
    stage?: "stage1" | "stage2" | "stage3" | "other";
}

/**
 * The Central Primitive Catalog (Stage 1).
 * Matches rows in invariants39.html.
 */
export const primitiveCatalog: PrimitiveCatalogEntry[] = [
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
        primitiveId: "P.INT_DIV_EXACT", // Heuristic: assume exact first
        description: "Integer Division (Exact)",
        operationType: "div",
        domainClass: "int-int",
        stage: "stage1"
    },
    // Note: P.INT_DIV_FRAC (5) is usually an alternative if exact fails, 
    // or we can just list it with lower priority? 
    // For now, let's stick to EXACT as the primary one for Stage 1.

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
        primitiveId: "P.FRAC_SUB_SAME",
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
        domainClass: "frac-diff-den", // or just frac-frac
        stage: "stage1"
    },
    {
        op: "/",
        lhsKind: "frac",
        rhsKind: "frac",
        primitiveId: "P.FRAC_DIV",
        description: "Fraction Division",
        operationType: "div",
        domainClass: "frac-diff-den",
        stage: "stage1"
    },

    // --- C. Decimals ---
    {
        op: "+",
        lhsKind: "decimal",
        rhsKind: "decimal",
        primitiveId: "P.DEC_ADD",
        description: "Decimal Addition"
    },
    {
        op: "-",
        lhsKind: "decimal",
        rhsKind: "decimal",
        primitiveId: "P.DEC_SUB",
        description: "Decimal Subtraction"
    },
    {
        op: "*",
        lhsKind: "decimal",
        rhsKind: "decimal",
        primitiveId: "P.DEC_MUL",
        description: "Decimal Multiplication"
    },
    {
        op: "/",
        lhsKind: "decimal",
        rhsKind: "decimal",
        primitiveId: "P.DEC_DIV",
        description: "Decimal Division"
    },

    // --- D. Mixed / Interop ---
    {
        op: "+",
        lhsKind: "int",
        rhsKind: "frac",
        primitiveId: "P.INT_PLUS_FRAC",
        description: "Integer + Fraction"
    },
    {
        op: "+",
        lhsKind: "frac",
        rhsKind: "int",
        primitiveId: "P.INT_PLUS_FRAC", // Commutative? Or need P.FRAC_PLUS_INT? 
        // Table only has P.INT_PLUS_FRAC (14). 
        // Let's assume user clicks operator.
        description: "Fraction + Integer"
    },
    {
        op: "-",
        lhsKind: "int",
        rhsKind: "frac",
        primitiveId: "P.INT_MINUS_FRAC",
        description: "Integer - Fraction"
    },

    // --- F. Zero Operations ---
    {
        op: "+",
        lhsKind: "zero",
        rhsKind: ["int", "frac", "decimal", "mixed", "other"],
        primitiveId: "P.ADD_ZERO_L",
        description: "Add Zero (Left)",
        priority: 10
    },
    {
        op: "+",
        lhsKind: ["int", "frac", "decimal", "mixed", "other"],
        rhsKind: "zero",
        primitiveId: "P.ADD_ZERO_R",
        description: "Add Zero (Right)",
        priority: 10
    },
    {
        op: "-",
        lhsKind: ["int", "frac", "decimal", "mixed", "other"],
        rhsKind: "zero",
        primitiveId: "P.SUB_ZERO",
        description: "Subtract Zero",
        priority: 10
    },
    // P.SUB_SELF (27) requires a == b. We can't check that easily in ClickContext yet.
    // We'll skip P.SUB_SELF for catalog-based selection for now unless we add `areOperandsEqual`.

    {
        op: "*",
        lhsKind: "zero",
        rhsKind: ["int", "frac", "decimal", "mixed", "other"],
        primitiveId: "P.MUL_ZERO_L",
        description: "Multiply by Zero (Left)",
        priority: 10
    },
    {
        op: "*",
        lhsKind: ["int", "frac", "decimal", "mixed", "other"],
        rhsKind: "zero",
        primitiveId: "P.MUL_ZERO_R",
        description: "Multiply by Zero (Right)",
        priority: 10
    },
    // P.FRAC_ZERO_NUM (30) is for Fraction node, not binary op usually.
    // P.DIV_ZERO_ERR (31) - we don't offer it as a step usually.

    // --- G. Identity Operations ---
    {
        op: "*",
        lhsKind: "one",
        rhsKind: ["int", "frac", "decimal", "mixed", "other"],
        primitiveId: "P.MUL_ONE_L",
        description: "Multiply by One (Left)",
        priority: 5
    },
    {
        op: "*",
        lhsKind: ["int", "frac", "decimal", "mixed", "other"],
        rhsKind: "one",
        primitiveId: "P.MUL_ONE_R",
        description: "Multiply by One (Right)",
        priority: 5
    },
    {
        op: "/",
        lhsKind: ["int", "frac", "decimal", "mixed", "other"],
        rhsKind: "one",
        primitiveId: "P.DIV_ONE",
        description: "Divide by One",
        priority: 5
    },
];

/**
 * Select matching primitives for a given context.
 */
export function selectPrimitivesForClick(ctx: ClickContext): PrimitiveCatalogEntry[] {

    return primitiveCatalog.filter(entry => {
        // Debug specific entry
        const isTarget = entry.primitiveId === "P.FRAC_SUB_SAME";

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
        if (entry.hasZero !== undefined && entry.hasZero !== ctx.hasZero) return false;
        if (entry.hasOne !== undefined && entry.hasOne !== ctx.hasOne) return false;
        if (entry.hasParens !== undefined && entry.hasParens !== ctx.hasParens) return false;


        return true;
    });
}

function matchKind(entryKind: OperandKind | OperandKind[], ctxKind: OperandKind): boolean {
    if (Array.isArray(entryKind)) {
        return entryKind.includes(ctxKind) || entryKind.includes("other"); // "other" is wildcard-ish for non-special
    }
    if (entryKind === "other") {
        // "other" matches anything that isn't specifically excluded? 
        // Or just matches anything that is not zero/one if we are strict?
        // For now, let's say "other" matches int/frac/mixed/decimal but NOT zero/one if those are distinct.
        // But if ctxKind is "int", does it match "other"? Yes, usually.
        // Let's keep it simple: "other" matches any non-none kind.
        return ctxKind !== "none";
    }
    return entryKind === ctxKind;
}

/**
 * Build ClickContext from AST and selection.
 */
export function buildClickContext(ast: AstNode, selectionPath: string): ClickContext | null {
    // 1. Find the selected node
    // We need a helper to find node by path. 
    // Assuming we have one or can implement a simple one here.
    // For now, let's assume we are given the node or can find it.
    // Since we don't want to import heavy AST logic if avoidable, let's assume we can traverse.

    // Actually, we need to find the node to know the Op.
    // And its children to know LHS/RHS.

    // Let's implement a minimal traversal or use existing `getNodeAt` if exported.
    // It is exported from `./ast`.

    const node = findNodeAt(ast, selectionPath);
    if (!node) return null;

    let op: OpKind = "unknown";
    let lhs: AstNode | undefined;
    let rhs: AstNode | undefined;

    if (node.type === "binaryOp") {
        op = node.op as OpKind;
        lhs = node.left;
        rhs = node.right;
    } else if (node.type === "fraction") {
        // Clicking the fraction bar? Treat as division?
        // Or maybe the user clicked the whole fraction?
        // If selectionPath points to the fraction node, we might treat it as "root" op if we want to simplify it?
        // But usually we click an operator.
        // For now, let's say if it's a fraction, we might be looking for simplification (P.FRAC_SIMPLIFY).
        // But our catalog above assumes binary ops.
        // Let's return null for now if not binaryOp, unless we add "root" op to catalog.
        return null;
    } else {
        return null;
    }

    const lhsKind = classifyOperand(lhs);
    const rhsKind = classifyOperand(rhs);

    let sameDenominator = false;
    if (lhsKind === "frac" && rhsKind === "frac" && lhs && rhs) {
        // Check denominators
        // We need to access numerator/denominator.
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

function classifyOperand(node: AstNode | undefined): OperandKind {
    if (!node) return "none";

    if (node.type === "integer") {
        if (node.value === "0") return "zero";
        if (node.value === "1") return "one";
        return "int";
    }

    if (node.type === "fraction") {
        return "frac";
    }

    if (node.type === "mixed") {
        return "mixed";
    }

    // If it's a binaryOp, it's a complex expression.
    // We might treat it as "other" or "int" if it evaluates?
    // For now: "other".
    return "other";
}

// Minimal AST traversal to avoid circular deps or complex imports if `getNodeAt` isn't perfect.
// But `getNodeAt` is standard. We imported `AstNode`.
// We need to import `getNodeAt` from `./ast`? 
// The file `./ast` exists.

import { getNodeAt } from "./ast";

function findNodeAt(root: AstNode, path: string): AstNode | undefined {
    return getNodeAt(root, path);
}
