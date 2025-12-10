/**
 * Primitive Debug Helper
 *
 * Computes primitive debug info for the selected operator in a step.
 */
import { buildPrimitiveMap } from "./PrimitiveMapBuilder";
export function computePrimitiveDebug(input) {
    const { expressionLatex, stage, astRoot, operatorIndex } = input;
    try {
        // Build a primitive map for the full expression at this stage.
        const map = buildPrimitiveMap(astRoot, stage, expressionLatex);
        if (operatorIndex == null || map.entries.length === 0) {
            return {
                primitiveId: null,
                status: "none",
                domain: null,
                reason: "No operator index provided or no primitive map entries.",
            };
        }
        // Try to find entry by operatorIndex.
        const entry = map.entries.find(e => e.operatorIndex === operatorIndex);
        if (!entry) {
            return {
                primitiveId: null,
                status: "none",
                domain: null,
                reason: `No primitive entry for operatorIndex=${operatorIndex}.`,
            };
        }
        return {
            primitiveId: entry.primitiveId ?? null,
            status: entry.status ?? "none",
            domain: entry.domain ?? null,
            reason: entry.reason ?? null,
        };
    }
    catch (err) {
        return {
            primitiveId: null,
            status: "error",
            domain: null,
            reason: err?.message ?? "Primitive classification failed.",
        };
    }
}
