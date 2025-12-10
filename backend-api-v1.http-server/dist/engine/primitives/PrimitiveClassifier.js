/**
 * Primitive Classifier
 *
 * Classifies a single AST node against the Primitive Registry.
 */
import { createPrimitiveRegistry, buildMatchContext, } from "./Registry";
const registry = createPrimitiveRegistry();
export function classifyNode(node, stage) {
    const ctx = buildMatchContext(node);
    // Try to obtain some stable node identifier from AST.
    // If AstNode already has an id, use it; otherwise, fall back to some derived key.
    // Note: Our current AstNode doesn't have an ID field, so we use nodeKind + value/op/etc.
    // In a real system we'd want stable IDs from the parser or a traversal pass.
    let nodeId = ctx.nodeKind;
    if (node.type === "binaryOp")
        nodeId += `(${node.op})`;
    else if (node.type === "integer")
        nodeId += `(${node.value})`;
    else if (node.type === "fraction")
        nodeId += `(${node.numerator}/${node.denominator})`;
    const matching = registry.findMatchingDescriptors(ctx, stage);
    if (matching.length === 0) {
        return {
            nodeId,
            primitiveId: null,
            status: "none",
            reason: "no-primitive-for-shape",
        };
    }
    if (matching.length > 1) {
        return {
            nodeId,
            primitiveId: null,
            status: "error",
            reason: "multiple-primitive-candidates",
        };
    }
    const desc = matching[0];
    const readiness = desc.isReady
        ? desc.isReady(ctx)
        : { ready: true };
    if (!readiness.ready) {
        return {
            nodeId,
            primitiveId: desc.id,
            domain: desc.domain,
            status: "blocked",
            reason: readiness.reasonIfBlocked ?? "blocked-by-readiness-check",
        };
    }
    return {
        nodeId,
        primitiveId: desc.id,
        domain: desc.domain,
        status: "ready",
    };
}
