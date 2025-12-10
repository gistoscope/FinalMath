/**
 * PrimitiveMaster (V5)
 *
 * Coordinator for the V5 Decision Layer.
 *
 * Responsibilities:
 *  - Receive click/context from Orchestrator.
 *  - Delegate to NodeContextBuilder -> PrimitiveMatcher -> PrimitiveSelector.
 *  - Return a deterministic SelectedOutcome.
 *
 * Legacy Compatibility:
 *  - Implements `match()` to support existing Orchestrator calls, adapting the V5 outcome
 *    to the legacy PrimitiveMasterResult format.
 */
import { PRIMITIVES_V5_TABLE } from "../engine/primitives.registry.v5";
import { NodeContextBuilder } from "../engine/v5/NodeContextBuilder";
import { PrimitiveMatcher } from "../engine/v5/PrimitiveMatcher";
import { PrimitiveSelector } from "../engine/v5/PrimitiveSelector";
import { toLatex, getNodeAt, getNodeByOperatorIndex } from "../mapmaster/ast";
// --- V5 PrimitiveMaster Class ---
export class PrimitiveMaster {
    constructor(deps) {
        this.deps = deps;
        this.contextBuilder = new NodeContextBuilder();
        this.matcher = new PrimitiveMatcher();
        this.selector = new PrimitiveSelector();
    }
    /**
     * Primary V5 API: Resolves the best primitive outcome for a given click.
     */
    async resolvePrimitive(params) {
        // 1. Parse AST (if needed)
        // In a real optimized system we might pass AST. For now, we parse.
        const ast = params.ast || await this.deps.parseLatexToAst(params.expressionLatex);
        if (!ast) {
            return { kind: "no-candidates", matches: [] };
        }
        // 2. Build Context
        const ctx = this.contextBuilder.buildContext({
            expressionId: params.expressionId,
            ast,
            click: {
                nodeId: params.click.nodeId,
                kind: params.click.kind,
                operatorIndex: params.click.operatorIndex
            }
        });
        // 3. Match
        const matches = this.matcher.match({
            table: PRIMITIVES_V5_TABLE,
            ctx
        });
        // 4. Select
        const outcome = this.selector.select(matches);
        console.log(`[V5-STEPMASTER] chosenPrimitiveId=${outcome.primitive?.id ?? "none"} operator=${ctx.operatorLatex ?? "?"} kind=${outcome.kind} score=${outcome.matches[0]?.score ?? 0}`);
        return outcome;
    }
    /**
     * Legacy Adapter: Implements the old `match` interface used by Orchestrator.
     */
    async match(request) {
        try {
            // Map legacy request to V5 resolvePrimitive params
            // 1. Parse
            const ast = await this.deps.parseLatexToAst(request.expressionLatex);
            if (!ast) {
                return { status: "error", errorCode: "parse-error", message: "Parse failed" };
            }
            // 2. Resolve Anchor (borrowing logic from old master)
            // We need to determine ClickTarget
            const clickTarget = this.resolveClickTarget(ast, request.selectionPath || "", request.operatorIndex);
            if (!clickTarget) {
                return { status: "no-match", reason: "selection-out-of-domain" };
            }
            // 3. V5 Pipeline
            const ctx = this.contextBuilder.buildContext({
                expressionId: request.expressionId || "unknown",
                ast,
                click: clickTarget
            });
            const matches = this.matcher.match({
                table: PRIMITIVES_V5_TABLE,
                ctx
            });
            const outcome = this.selector.select(matches);
            // 4. Map to Legacy Result
            if (outcome.kind === "no-candidates" || !outcome.primitive) {
                return {
                    status: "no-match",
                    reason: "no-primitive-for-selection",
                    debug: {
                        candidates: outcome.matches.map(m => ({
                            primitiveId: m.row.id,
                            verdict: "not-applicable"
                        }))
                    }
                };
            }
            // Note: Legacy `window` logic was simple.
            const centerPath = ctx.nodeId;
            const window = {
                centerPath,
                latexFragment: toLatex(ast) // Approximate
            };
            const debugCandidates = outcome.matches.map(m => ({
                primitiveId: m.row.id,
                verdict: "applicable",
                reason: `Score: ${m.score}`
            }));
            // For now, return "match-found" with the chosen primitive ID.
            return {
                status: "match-found",
                primitiveId: outcome.primitive.id,
                window,
                debug: { candidates: debugCandidates }
            };
        }
        catch (e) {
            return { status: "error", errorCode: "internal-error", message: e.message };
        }
    }
    resolveClickTarget(ast, selectionPath, operatorIndex) {
        // 1. Try Operator Index
        if (typeof operatorIndex === "number") {
            const found = getNodeByOperatorIndex(ast, operatorIndex);
            if (found) {
                return {
                    nodeId: found.path,
                    kind: this.classifyNode(found.node),
                    operatorIndex
                };
            }
        }
        // 2. Try Path
        if (selectionPath) {
            const cleanPath = selectionPath.replace(/\.op$/, "");
            const node = getNodeAt(ast, cleanPath);
            if (node) {
                return {
                    nodeId: cleanPath,
                    kind: this.classifyNode(node)
                };
            }
        }
        return undefined;
    }
    classifyNode(node) {
        if (node.type === "binaryOp")
            return "operator";
        // Most V5 primitives classify fraction bar related ops as operators for now, 
        // OR as "fractionBar" if specific. Let's map to "operator" for compatibility with existing patterns
        // unless table specifically distinguishes.
        // But wait, the V5 spec says `kind: ClickTargetKind`.
        // Primitives table rows have `clickTargetKind`.
        // If I map fraction to "operator", then `P.FRAC_SIMPLIFY` (if it targets fraction) must expect "operator".
        // Let's assume standard "operator" for now.
        if (node.type === "fraction")
            return "operator";
        if (node.type === "integer")
            return "number";
        if (node.type === "mixed")
            return "number";
        return "other";
    }
}
// Factory for backward compatibility
export function createPrimitiveMaster(deps) {
    return new PrimitiveMaster(deps);
}
