import { parseExpression } from "./ast";
import { MapMasterAstHelpers } from "./mapmaster.ast-helpers";
import { mapMasterDebug } from "./mapmaster.debug";
export function buildGlobalMap(input) {
    const { expressionLatex, invariantSetIds, registry } = input;
    // 1. Parse AST once
    const ast = parseExpression(expressionLatex);
    if (!ast) {
        throw new Error("Failed to parse expression for MapMaster global map.");
    }
    // 2. Instantiate MapMasterAstHelpers
    const astHelpers = new MapMasterAstHelpers();
    // 3. Iterate over operators
    const entries = [];
    const MAX_OPERATORS = 512;
    let operatorCount = 0;
    let candidatefulAnchorCount = 0;
    for (let operatorIndex = 0; operatorIndex < MAX_OPERATORS; operatorIndex++) {
        const path = astHelpers.findNthOperator(ast, operatorIndex);
        if (!path) {
            break; // No more operators
        }
        // Construct MapMasterInput for this operator
        const mmInput = {
            expressionLatex,
            selectionPath: null,
            operatorIndex,
            invariantSetIds,
            registry,
        };
        // Call mapMasterDebug
        const debugResult = mapMasterDebug(mmInput);
        // Extract anchor info
        let anchorNodeId = "";
        let anchorKind = "unknown";
        if (debugResult.pipeline.selection.status === "ok") {
            anchorNodeId = debugResult.pipeline.selection.anchorNodeId || "";
            anchorKind = debugResult.pipeline.selection.anchorKind || "unknown";
        }
        else {
            // Fallback for non-ok status, though findNthOperator found it, so it should be ok usually
            anchorNodeId = `op-${operatorIndex}`;
        }
        const candidateCount = debugResult.candidates.length;
        const hasCandidates = candidateCount > 0;
        entries.push({
            anchorNodeId,
            anchorKind,
            operatorIndex,
            debug: debugResult,
            hasCandidates,
            candidateCount
        });
        operatorCount++;
        if (hasCandidates) {
            candidatefulAnchorCount++;
        }
    }
    // 4. Return result
    return {
        expressionLatex,
        invariantSetIds,
        astSnapshot: ast,
        entries,
        operatorCount,
        candidatefulAnchorCount,
    };
}
