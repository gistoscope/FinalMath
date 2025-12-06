import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const CONFIG_DIR_RELATIVE = ["..", "..", "config", "invariants"];
function isWholeExpression(surface) {
    return (surface.surfaceNodeId === "surf-whole-expression" &&
        (surface.selection.length === 0 ||
            surface.selection.includes("surf-whole-expression")));
}
function isFraction(node) {
    return node.type === "fraction";
}
function isSimpleFractionSum(ast) {
    return (ast.type === "sum" &&
        isFraction(ast.left) &&
        isFraction(ast.right));
}
function gcdFromStrings(aStr, bStr) {
    const a = Number.parseInt(aStr, 10);
    const b = Number.parseInt(bStr, 10);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
        return undefined;
    }
    let x = Math.abs(a);
    let y = Math.abs(b);
    if (x === 0 && y === 0) {
        return undefined;
    }
    while (y !== 0) {
        const t = y;
        y = x % y;
        x = t;
    }
    return x;
}
function buildWhenPredicate(entry) {
    const { shape, surface: surfacePattern } = entry;
    return ({ ast, surface }) => {
        if (surfacePattern.mode === "whole-expression" && !isWholeExpression(surface)) {
            return false;
        }
        if (shape.kind === "frac-sum") {
            if (!isSimpleFractionSum(ast)) {
                return false;
            }
            const left = ast.left;
            const right = ast.right;
            const mode = shape.denominators ?? "any";
            if (mode === "different" && left.denominator === right.denominator) {
                return false;
            }
            if (mode === "equal" && left.denominator !== right.denominator) {
                return false;
            }
            return true;
        }
        if (shape.kind === "single-frac") {
            if (!isFraction(ast)) {
                return false;
            }
            const gcdLimit = shape.gcdGreaterThan ?? 1;
            const g = gcdFromStrings(ast.numerator, ast.denominator);
            if (g === undefined) {
                return false;
            }
            return g > gcdLimit;
        }
        if (shape.kind === "frac-sub") {
            if (ast.type !== "diff" || !isFraction(ast.left) || !isFraction(ast.right)) {
                return false;
            }
            const left = ast.left;
            const right = ast.right;
            const mode = shape.denominators ?? "any";
            if (mode === "different" && left.denominator === right.denominator) {
                return false;
            }
            if (mode === "equal" && left.denominator !== right.denominator) {
                return false;
            }
            return true;
        }
        return false;
    };
}
let REGISTRY_CACHE;
function loadAllInvariantSetsFromConfig() {
    if (REGISTRY_CACHE) {
        return REGISTRY_CACHE;
    }
    const moduleDir = dirname(fileURLToPath(import.meta.url));
    const configDir = resolve(moduleDir, ...CONFIG_DIR_RELATIVE);
    let files = [];
    try {
        files = readdirSync(configDir).filter((name) => name.endsWith(".json"));
    }
    catch {
        // If the config directory is missing we treat it as "no invariants".
        REGISTRY_CACHE = {};
        return REGISTRY_CACHE;
    }
    const registry = {};
    for (const fileName of files) {
        const fullPath = resolve(configDir, fileName);
        let raw;
        try {
            raw = readFileSync(fullPath, "utf8");
        }
        catch {
            // Skip unreadable file.
            continue;
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch {
            // Skip invalid JSON.
            continue;
        }
        const setId = parsed.invariantSetId;
        const entries = parsed.invariants ?? [];
        const records = entries.map((entry) => ({
            id: entry.id,
            invariantSetId: setId,
            description: entry.description,
            priority: entry.priority,
            primitiveIds: entry.primitiveIds,
            scenarioId: entry.scenarioId,
            teachingTag: entry.teachingTag,
            when: buildWhenPredicate(entry),
        }));
        if (!registry[setId]) {
            registry[setId] = [];
        }
        registry[setId] = registry[setId].concat(records);
    }
    REGISTRY_CACHE = registry;
    return REGISTRY_CACHE;
}
export function getInvariantsBySetId(id) {
    const registry = loadAllInvariantSetsFromConfig();
    return registry[id] ?? [];
}
