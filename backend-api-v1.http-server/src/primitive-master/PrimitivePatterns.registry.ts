/**
 * Primitive pattern registry implementation.
 *
 * Implements patterns for primitives defined in primitives.registry.ts.
 */
import type { AstNode, BinaryOpNode, FractionNode } from "../mapmaster/ast";
import type { PrimitiveId } from "../primitives/primitives.registry";
import type {
    PrimitivePattern,
    PrimitivePatternMatchInput,
    PrimitivePatternRegistry,
    SelectionKind,
} from "./PrimitivePatterns";

function isBinaryOp(node: AstNode): node is BinaryOpNode {
    return node.type === "binaryOp";
}

function isFraction(node: AstNode): node is FractionNode {
    return node.type === "fraction";
}

function createIntAddPattern(): PrimitivePattern {
    return {
        primitiveId: "P.INT_ADD",
        match(input: PrimitivePatternMatchInput): boolean {
            const node = input.node;
            if (!isBinaryOp(node)) return false;
            if (node.op !== "+") return false;
            return node.left.type === "integer" && node.right.type === "integer";
        },
    };
}

function createIntSubPattern(): PrimitivePattern {
    return {
        primitiveId: "P.INT_SUB",
        match(input: PrimitivePatternMatchInput): boolean {
            const node = input.node;
            if (!isBinaryOp(node)) return false;
            if (node.op !== "-") return false;
            return node.left.type === "integer" && node.right.type === "integer";
        },
    };
}

function createFracAddSameDenPattern(): PrimitivePattern {
    return {
        primitiveId: "P.FRAC_ADD_SAME_DEN",
        match(input: PrimitivePatternMatchInput): boolean {
            const node = input.node;
            if (!isBinaryOp(node)) return false;
            if (node.op !== "+") return false;
            if (!isFraction(node.left) || !isFraction(node.right)) return false;
            return node.left.denominator === node.right.denominator;
        },
    };
}

function createFracSubSameDenPattern(): PrimitivePattern {
    return {
        primitiveId: "P.FRAC_SUB_SAME_DEN",
        match(input: PrimitivePatternMatchInput): boolean {
            const node = input.node;
            if (!isBinaryOp(node)) return false;
            if (node.op !== "-") return false;
            if (!isFraction(node.left) || !isFraction(node.right)) return false;
            return node.left.denominator === node.right.denominator;
        },
    };
}

function createIntDivToIntPattern(): PrimitivePattern {
    return {
        primitiveId: "P.INT_DIV_TO_INT",
        match(input: PrimitivePatternMatchInput): boolean {
            const node = input.node;
            if (!isBinaryOp(node)) return false;
            // Matches both : and / because parser normalizes to /
            if (node.op !== "/") return false;
            return node.left.type === "integer" && node.right.type === "integer";
        },
    };
}

export function createPrimitivePatternRegistry(): PrimitivePatternRegistry {
    const patterns: PrimitivePattern[] = [
        createIntAddPattern(),
        createIntSubPattern(),
        createFracAddSameDenPattern(),
        createFracSubSameDenPattern(),
        createIntDivToIntPattern(),
    ];

    return {
        getPatternsFor(args: { invariantSetId?: string; selectionKind: SelectionKind }): PrimitivePattern[] {
            if (args.selectionKind === "operator") {
                return patterns;
            }
            return [];
        },
    };
}
