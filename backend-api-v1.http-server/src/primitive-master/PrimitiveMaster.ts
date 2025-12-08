/**
 * PrimitiveMaster
 *
 * High-level responsibility:
 *  - Given an expression (LaTeX string) and a selection (path / operator index),
 *    decide which primitive (if any) is applicable.
 *
 * This module is deliberately kept independent from HTTP / transport concerns.
 */
import type { PrimitiveId } from "../primitives/primitives.registry";
import type { AstNode } from "../mapmaster/ast";
import { getNodeAt, getNodeByOperatorIndex, toLatex } from "../mapmaster/ast";
import type {
    PrimitivePatternRegistry,
} from "./PrimitivePatterns";
import { SelectionKind } from "./PrimitivePatterns";

export type PrimitiveMasterStatus = "match-found" | "no-match" | "error";

export interface PrimitiveMasterRequest {
    expressionLatex: string;
    /**
     * Logical selection path produced by the viewer.
     * For operator selections it may end with ".op".
     */
    selectionPath: string | null;
    /**
     * Ordinal index of the operator within the expression (0-based).
     */
    operatorIndex?: number;
    invariantSetId?: string;
    expressionId?: string;
    context?: unknown;
}

export interface PrimitiveMasterWindow {
    centerPath: string;
    /**
     * LaTeX fragment representing at least the selected subexpression.
     * For now we simply return the full expression; this can be refined later.
     */
    latexFragment: string;
    leftContextPaths?: string[];
    rightContextPaths?: string[];
}

export interface PrimitiveMasterDebugCandidate {
    primitiveId: PrimitiveId;
    verdict: "applicable" | "not-applicable";
    reason?: string;
}

export interface PrimitiveMasterDebug {
    candidates: PrimitiveMasterDebugCandidate[];
}

export interface PrimitiveMasterResultMatch {
    status: "match-found";
    primitiveId: PrimitiveId;
    window: PrimitiveMasterWindow;
    debug?: PrimitiveMasterDebug;
}

export interface PrimitiveMasterResultNoMatch {
    status: "no-match";
    reason:
    | "selection-out-of-domain"
    | "no-primitive-for-selection";
    debug?: PrimitiveMasterDebug;
}

export interface PrimitiveMasterResultError {
    status: "error";
    errorCode: "parse-error" | "internal-error";
    message: string;
}

export type PrimitiveMasterResult =
    | PrimitiveMasterResultMatch
    | PrimitiveMasterResultNoMatch
    | PrimitiveMasterResultError;

export interface PrimitiveMasterDeps {
    parseLatexToAst: (latex: string, invariantSetId?: string) => Promise<AstNode | undefined>;
    patternRegistry: PrimitivePatternRegistry;
    log?: (message: string) => void;
}

export interface PrimitiveMaster {
    match(request: PrimitiveMasterRequest): Promise<PrimitiveMasterResult>;
}

interface AnchorInfo {
    node: AstNode;
    path: string;
    selectionKind: SelectionKind;
}

export function createPrimitiveMaster(deps: PrimitiveMasterDeps): PrimitiveMaster {
    const { parseLatexToAst, patternRegistry, log } = deps;

    async function match(request: PrimitiveMasterRequest): Promise<PrimitiveMasterResult> {
        try {
            const ast = await parseLatexToAst(request.expressionLatex, request.invariantSetId);
            if (!ast) {
                return {
                    status: "error",
                    errorCode: "parse-error",
                    message: "Failed to parse expressionLatex into AST",
                };
            }

            const anchor = resolveAnchorFromSelection(ast, request.selectionPath, request.operatorIndex);
            if (!anchor) {
                return {
                    status: "no-match",
                    reason: "selection-out-of-domain",
                };
            }

            const patterns = patternRegistry.getPatternsFor({
                invariantSetId: request.invariantSetId,
                selectionKind: anchor.selectionKind,
            });

            const debugCandidates: PrimitiveMasterDebugCandidate[] = [];

            for (const pattern of patterns) {
                const applicable = pattern.match({
                    ast,
                    node: anchor.node,
                    selectionPath: anchor.path,
                    operatorIndex: request.operatorIndex,
                });

                debugCandidates.push({
                    primitiveId: pattern.primitiveId,
                    verdict: applicable ? "applicable" : "not-applicable",
                });

                if (applicable) {
                    const window = buildWindowFragment(ast, anchor.path);
                    return {
                        status: "match-found",
                        primitiveId: pattern.primitiveId,
                        window,
                        debug: { candidates: debugCandidates },
                    };
                }
            }

            return {
                status: "no-match",
                reason: "no-primitive-for-selection",
                debug: { candidates: debugCandidates },
            };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Unknown error in PrimitiveMaster.match";
            if (log) {
                log(`[PrimitiveMaster] error: ${message}`);
            }
            return {
                status: "error",
                errorCode: "internal-error",
                message,
            };
        }
    }

    return { match };
}

/**
 * Resolve the anchor node and its classification from the selection.
 *
 * For now we prefer `operatorIndex` when provided, because it is more robust
 * and directly supported by the AST helpers.
 */
function resolveAnchorFromSelection(
    ast: AstNode,
    selectionPath: string | null,
    operatorIndex?: number,
): AnchorInfo | undefined {
    // Prefer operator index if available.
    if (typeof operatorIndex === "number") {
        const found = getNodeByOperatorIndex(ast, operatorIndex);
        if (!found) return undefined;

        const selectionKind = classifyNode(found.node);

        // For reporting we want a stable logical center path.
        let centerPath: string;
        if (selectionPath && selectionPath.endsWith(".op")) {
            centerPath = selectionPath.slice(0, -".op".length);
        } else if (found.path === "root") {
            // For top-level operator we normalise to "term[0]" to match UI expectations.
            centerPath = "term[0]";
        } else {
            centerPath = found.path;
        }

        return {
            node: found.node,
            path: centerPath,
            selectionKind,
        };
    }

    // Fallback: use selectionPath only.
    if (selectionPath) {
        const basePath = selectionPath.endsWith(".op")
            ? selectionPath.slice(0, -".op".length)
            : selectionPath;

        const node = basePath === "root" || basePath === ""
            ? ast
            : getNodeAt(ast, basePath);

        if (!node) return undefined;

        const selectionKind = classifyNode(node);

        return {
            node,
            path: basePath,
            selectionKind,
        };
    }

    return undefined;
}

function classifyNode(node: AstNode): SelectionKind {
    if (node.type === "binaryOp") return "operator";
    if (node.type === "fraction") return "fraction";
    if (node.type === "integer") return "integer";
    return "other";
}

function buildWindowFragment(ast: AstNode, anchorPath: string): PrimitiveMasterWindow {
    // For Stage 1 we keep this simple and just return the full expression.
    return {
        centerPath: anchorPath,
        latexFragment: toLatex(ast),
        leftContextPaths: [],
        rightContextPaths: [],
    };
}
