/**
 * Primitive Registry
 *
 * Defines the types and interfaces for the "dictionary of primitives".
 * This registry knows what primitives exist, what shapes they apply to,
 * and whether they are ready to be executed.
 */
/**
 * Helper to build a match context from an AST node.
 */
export function buildMatchContext(node) {
    const ctx = {
        node,
        nodeKind: node.type, // "binaryOp", "integer", "fraction", etc.
    };
    if (node.type === "binaryOp") {
        ctx.op = node.op;
        ctx.left = node.left;
        ctx.right = node.right;
        ctx.leftIsInteger = node.left.type === "integer";
        ctx.rightIsInteger = node.right.type === "integer";
        ctx.leftIsFraction = node.left.type === "fraction";
        ctx.rightIsFraction = node.right.type === "fraction";
    }
    return ctx;
}
import { INTEGER_PRIMITIVES } from "./Integers";
import { FRACTIONS_SAME_DEN_PRIMITIVES } from "./Fractions.SameDenominator";
const ALL_DESCRIPTORS = [
    ...INTEGER_PRIMITIVES,
    ...FRACTIONS_SAME_DEN_PRIMITIVES,
];
// Placeholder for createPrimitiveRegistry until we have the primitive files.
// We will update this later to import and use the actual primitives.
export function createPrimitiveRegistry() {
    const all = ALL_DESCRIPTORS.slice(); // shallow copy for safety
    function getAllDescriptors() {
        return all;
    }
    function findMatchingDescriptors(ctx, stage) {
        return all.filter((desc) => {
            const { min, max } = desc.stageRange;
            if (stage < min || stage > max)
                return false;
            return desc.isMatch(ctx);
        });
    }
    function getDescriptorById(id) {
        return all.find((d) => d.id === id);
    }
    return {
        getAllDescriptors,
        findMatchingDescriptors,
        getDescriptorById,
    };
}
export function getRegistryForStage(stage) {
    const base = createPrimitiveRegistry();
    return {
        stage,
        getAllDescriptors: () => base.getAllDescriptors().filter((d) => {
            const { min, max } = d.stageRange;
            return stage >= min && stage <= max;
        }),
        findMatchingDescriptors: (ctx) => base.findMatchingDescriptors(ctx, stage),
        getDescriptorById: (id) => {
            const desc = base.getDescriptorById(id);
            if (!desc)
                return undefined;
            const { min, max } = desc.stageRange;
            if (stage < min || stage > max)
                return undefined;
            return desc;
        },
    };
}
