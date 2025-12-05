/**
 * MapMaster Core (TzV1.1)
 *
 * Responsibilities:
 *  - For a given current state (expression + selection + active invariant sets) and registry:
 *    - determine which invariant rules are applicable;
 *    - generate a list of step candidates.
 */

import type {
    InMemoryInvariantRegistry,
    InvariantRuleId,
    InvariantSetId,
    PrimitiveId,
} from "../invariants/index";
import { parseExpression, getNodeByOperatorIndex, getNodeAt } from "./ast";
import { Matchers } from "./rules/index";
import { GenericPatternMatcher } from "./GenericPatternMatcher";
import { buildClickContext, selectPrimitivesForClick } from "./primitive-catalog";

export interface MapMasterInput {
    expressionLatex: string;
    selectionPath: string | null;      // path to selected node in Surface/AST
    operatorIndex?: number;            // optional: linear index of operator
    invariantSetIds: InvariantSetId[]; // active invariant sets (for v1.1: one default set)
    registry: InMemoryInvariantRegistry;
}

export type MapMasterCandidateId = string & { __brand: "MapMasterCandidateId" };

export interface MapMasterCandidate {
    id: MapMasterCandidateId;
    invariantRuleId: InvariantRuleId;
    primitiveIds: PrimitiveId[];
    targetPath: string;                // where to apply the step
    description: string;               // debug/teacher description
    bindings?: Record<string, any>;    // Variable bindings from pattern match
    resultPattern?: string;            // Result pattern for generic execution
}

export interface MapMasterResult {
    candidates: MapMasterCandidate[];
    resolvedSelectionPath?: string;
}

/**
 * Generate step candidates based on the input.
 *
 * TzV1.1 allows simple heuristic logic.
 */
export function mapMasterGenerate(input: MapMasterInput): MapMasterResult {
    const { expressionLatex, selectionPath, operatorIndex, invariantSetIds, registry } = input;
    const candidates: MapMasterCandidate[] = [];

    // 1. Parse expression using robust AST parser
    const ast = parseExpression(expressionLatex);
    if (!ast) {
        return { candidates: [] };
    }

    // Resolve path from operatorIndex if available
    let resolvedPath = selectionPath;
    if (typeof operatorIndex === "number") {
        const found = getNodeByOperatorIndex(ast, operatorIndex);
        if (found) {
            resolvedPath = found.path;
        }
    }

    // Calculate paths to check (current + parent)
    const pathsToCheck = [resolvedPath || "root"];
    if (resolvedPath && resolvedPath !== "root") {
        const lastDot = resolvedPath.lastIndexOf(".");
        if (lastDot !== -1) {
            pathsToCheck.push(resolvedPath.substring(0, lastDot));
        } else {
            pathsToCheck.push("root");
        }
    }

    // 2. Iterate over active invariant sets
    for (const setId of invariantSetIds) {
        const set = registry.getInvariantSetById(setId);
        if (!set) continue;

        for (const rule of set.rules) {
            // 3. Find matcher for this rule (via primitives)
            let matched = false;

            // Iterate over paths (child first, then parent)
            for (const pathToCheck of pathsToCheck) {
                if (matched) break;

                // STAGE 1 ENFORCEMENT:
                // For basic arithmetic operators (+, -, *, /), we ONLY use the catalog.
                // We check if the node at pathToCheck is a binaryOp of these types.
                // If so, we skip the legacy matcher loop and rely on the catalog block below.
                const nodeAtTarget = getNodeAt(ast, pathToCheck);
                const isBasicArithmetic = nodeAtTarget?.type === "binaryOp" &&
                    ["+", "-", "*", "/"].includes(nodeAtTarget.op);

                if (isBasicArithmetic) {
                    // Skip legacy matchers for this node.
                    // We will handle it in the "Catalog-based Candidate Generation" block.
                    continue;
                }

                for (const primId of rule.primitiveIds) {
                    const primitive = registry.getPrimitiveById(primId);
                    if (!primitive) continue;

                    if (primitive.pattern) {
                        try {
                            const matcher = new GenericPatternMatcher(primitive.pattern);
                            const targetNode = getNodeAt(ast, pathToCheck);

                            if (targetNode) {
                                let allowedTypes: Set<string> | undefined;
                                if (primitive.category === 'integer' || primitive.category === 'fraction' || primitive.category === 'decimal' || primitive.category === 'mixed') {
                                    allowedTypes = new Set(['integer']);
                                }

                                const bindings = matcher.matches(targetNode, allowedTypes);
                                if (bindings) {
                                    candidates.push({
                                        id: `cand-${candidates.length + 1}` as MapMasterCandidateId,
                                        invariantRuleId: rule.id,
                                        primitiveIds: rule.primitiveIds,
                                        targetPath: pathToCheck,
                                        description: rule.description,
                                        bindings: bindings,
                                        resultPattern: primitive.resultPattern,
                                    });
                                    matched = true;
                                    break;
                                }
                            }
                        } catch (e) {
                            // console.error(`Error matching pattern ${primitive.pattern}:`, e);
                        }
                    } else {
                        // Fallback to legacy matchers
                        const matcher = Matchers.find(m => m.primitiveId === primId);
                        if (matcher) {
                            const isMatch = matcher.matches(ast, pathToCheck);
                            if (isMatch) {
                                candidates.push({
                                    id: `cand-${candidates.length + 1}` as MapMasterCandidateId,
                                    invariantRuleId: rule.id,
                                    primitiveIds: rule.primitiveIds,
                                    targetPath: pathToCheck,
                                    description: rule.description,
                                });
                                matched = true;
                                break;
                            }
                        }
                    }
                }
                if (matched) break; // Move to next rule if matched
            }
        }
    }

    // 4. (New) Catalog-based Candidate Generation
    // We try to build a ClickContext from the selection and find matching primitives.

    for (const pathToCheck of pathsToCheck) {
        const clickContext = buildClickContext(ast, pathToCheck);
        console.log(`[MapMaster] Checking path=${pathToCheck} context=`, clickContext);
        if (clickContext) {
            const catalogEntries = selectPrimitivesForClick(clickContext);
            console.log(`[MapMaster] Catalog entries for ${pathToCheck}:`, catalogEntries.map(e => e.primitiveId));

            // Deterministic Selection:
            // If multiple entries match, we sort by priority (descending) and then by primitiveId (asc).
            catalogEntries.sort((a, b) => {
                const pA = a.priority ?? 0;
                const pB = b.priority ?? 0;
                if (pA !== pB) return pB - pA;
                return a.primitiveId.localeCompare(b.primitiveId);
            });

            for (const entry of catalogEntries) {
                // Helper: find rule by primitive ID
                const rules = registry.findRulesByPrimitiveId(entry.primitiveId);
                console.log(`[MapMaster] Rules for ${entry.primitiveId}:`, rules.map(r => r.id));
                if (rules.length > 0) {
                    const rule = rules[0];

                    // Check if we already have this candidate (deduplication)
                    const exists = candidates.some(c => c.targetPath === pathToCheck && c.primitiveIds.includes(entry.primitiveId));
                    if (exists) continue;

                    candidates.push({
                        id: `cand-cat-${candidates.length + 1}` as MapMasterCandidateId,
                        invariantRuleId: rule.id,
                        primitiveIds: [entry.primitiveId],
                        targetPath: pathToCheck,
                        description: entry.description || rule.description,
                    });
                }
            }
        }
    }

    // Sort candidates: Prioritize parent matches (root) over child matches
    // Also specifically lower priority of simplification primitives if needed
    candidates.sort((a, b) => {
        // 1. Prefer candidates targeting 'root' (or shorter paths)
        const depthA = a.targetPath === 'root' ? 0 : a.targetPath.split('.').length;
        const depthB = b.targetPath === 'root' ? 0 : b.targetPath.split('.').length;
        if (depthA !== depthB) return depthA - depthB; // Lower depth first (root < term[0])

        return 0;
    });

    console.log(`[MapMaster] Final candidates:`, candidates.map(c => c.primitiveIds));
    return { candidates, resolvedSelectionPath: resolvedPath || undefined };
}
