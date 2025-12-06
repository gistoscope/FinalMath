/**
 * MapMasterLite — Stage 5.3.a
 *
 * Invariants-driven MapMaster implementation for simple fraction expressions.
 * Instead of hard-coding particular LaTeX patterns directly in MapMasterLite,
 * we delegate the decision to the invariant registry loaded from config files.
 */
import { getInvariantsBySetId, FRACTIONS_BASIC_SET_ID, } from "../invariants/index.js";
function buildSurfaceSelection(request) {
    const event = request.clientEvent;
    if (!event || event.type !== "click") {
        return undefined;
    }
    return {
        surfaceNodeId: event.surfaceNodeId,
        selection: event.selection ?? [],
    };
}
/**
 * Very small parser that recognises only the shapes we care about:
 *
 *   - a/b + c/d
 *   - a/b
 *
 * Everything else is left undefined and treated as "no invariants apply".
 */
function parseExpressionAstLite(latex) {
    const compact = latex.replace(/\s+/g, "");
    // a/b (+|-) c/d  — both addition and subtraction are treated as "sum"
    const sumMatch = compact.match(/^(-?\d+)\/(\d+)([+-])(-?\d+)\/(\d+)$/);
    if (sumMatch) {
        const [, leftNum, leftDen, op, rightNumRaw, rightDen] = sumMatch;
        if (leftDen === "0" || rightDen === "0") {
            return undefined;
        }
        const left = {
            type: "fraction",
            numerator: leftNum,
            denominator: leftDen,
        };
        const right = {
            type: "fraction",
            numerator: op === "-" ? `-${rightNumRaw}` : rightNumRaw,
            denominator: rightDen,
        };
        return {
            type: "sum",
            left,
            right,
        };
    }
    // a/b or -a/b
    const fracMatch = compact.match(/^(-?\d+)\/(\d+)$/);
    if (fracMatch) {
        const [, num, den] = fracMatch;
        if (den === "0") {
            return undefined;
        }
        return {
            type: "fraction",
            numerator: num,
            denominator: den,
        };
    }
    return undefined;
}
function getInvariantRecords(invariantSetId) {
    const setId = (invariantSetId ?? FRACTIONS_BASIC_SET_ID);
    return getInvariantsBySetId(setId);
}
/**
 * Main entry point for MapMasterLite.
 *
 * Given an EngineStepRequest, it:
 *   1. Builds a tiny AST and surface-selection view.
 *   2. Looks up the invariant set by invariantSetId.
 *   3. Filters invariants by their `when(...)` predicate.
 *   4. Returns candidates ordered by priority.
 */
export async function buildMapLite(request, _deps) {
    const surface = buildSurfaceSelection(request);
    if (!surface) {
        // For now MapMasterLite only reacts to click events.
        return { candidates: [] };
    }
    const ast = parseExpressionAstLite(request.latex);
    if (!ast) {
        return { candidates: [] };
    }
    const invariants = getInvariantRecords(request.invariantSetId);
    if (invariants.length === 0) {
        return { candidates: [] };
    }
    const applicable = [];
    for (const record of invariants) {
        try {
            if (record.when({
                ast,
                surface,
            })) {
                applicable.push(record);
            }
        }
        catch {
            // Defensive: a single invariant must not break the whole plan.
            // We simply skip invariants that throw.
        }
    }
    if (applicable.length === 0) {
        return { candidates: [] };
    }
    // Order by priority (ascending).
    applicable.sort((a, b) => a.priority - b.priority);
    const candidates = applicable.map((record) => {
        const primitiveId = record.primitiveIds[0];
        return {
            primitiveId,
            label: record.description,
        };
    });
    return { candidates };
}
