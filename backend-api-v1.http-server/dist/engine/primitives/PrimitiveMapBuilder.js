/**
 * Primitive Map Builder
 *
 * Builds a map of primitives for an entire expression AST.
 */
import { classifyNode } from "./PrimitiveClassifier";
function collectOperatorNodes(node, result) {
    if (node.type === "binaryOp") {
        result.push(node);
        collectOperatorNodes(node.left, result);
        collectOperatorNodes(node.right, result);
        return;
    }
    if (node.type === "fraction") {
        // Fractions are leaves for now in terms of operator collection
        // (unless we want to recurse into numerator/denominator if they are expressions)
        // Our current parser allows expressions in num/den, but AstNode types define them as strings.
        // If they were AstNodes, we would recurse.
        // For now, we assume simple fractions.
        return;
    }
    // Integer, Mixed, Variable are leaves.
}
export function buildPrimitiveMap(root, stage, expressionLatex) {
    const operatorNodes = [];
    collectOperatorNodes(root, operatorNodes);
    const entries = operatorNodes.map((node, index) => {
        const binding = classifyNode(node, stage);
        return {
            ...binding,
            operatorIndex: index,
        };
    });
    let readyCount = 0;
    let blockedCount = 0;
    let noneCount = 0;
    let errorCount = 0;
    for (const e of entries) {
        if (e.status === "ready")
            readyCount++;
        else if (e.status === "blocked")
            blockedCount++;
        else if (e.status === "none")
            noneCount++;
        else if (e.status === "error")
            errorCount++;
    }
    return {
        expressionLatex,
        stage,
        entries,
        operatorCount: entries.length,
        readyCount,
        blockedCount,
        noneCount,
        errorCount,
    };
}
