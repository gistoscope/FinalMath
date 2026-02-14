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

import { container, injectable } from "tsyringe";
import { AstNode, AstParser, AstUtils } from "../ast";
import {
  NodeContext,
  PrimitiveMasterDebugCandidate,
  PrimitiveMasterRequest,
  PrimitiveMasterResult,
  PrimitiveMasterWindow,
  ResolvePrimitiveParams,
} from "./primitive-master.type";
import { NodeContextBuilder } from "./provider/context-builder/context-builder.core";
import { PrimitiveMatcher } from "./provider/matcher";
import { PrimitiveSelector } from "./provider/selector";
import { SelectedOutcome } from "./provider/selector/selector.type";
import { PRIMITIVES_V5_TABLE } from "./registry/primitives.table";

// --- V5 PrimitiveMaster Class ---

@injectable()
export class PrimitiveMaster {
  constructor(
    private readonly selector: PrimitiveSelector,
    private readonly matcher: PrimitiveMatcher,
    private readonly contextBuilder: NodeContextBuilder,
    private readonly astParser: AstParser,
    private readonly astUtils: AstUtils
  ) {}

  /**
   * Primary V5 API: Resolves the best primitive outcome for a given click.
   */
  public async resolvePrimitive(params: ResolvePrimitiveParams): Promise<SelectedOutcome> {
    // 1. Parse AST (if needed)
    // In a real optimized system we might pass AST. For now, we parse.
    const { expressionId, expressionLatex, click, ast: paramsAst, preferredPrimitiveId } = params;
    const ast = paramsAst || this.astParser.parse(expressionLatex);
    if (!ast) {
      return { kind: "red-diagnostic", matches: [] };
    }
    const clickKind = click.kind;
    const defaultNormalizedClick = {
      nodeId: click.nodeId,
      kind: click.kind,
      operatorIndex: click.operatorIndex,
    };
    const normalizedClick =
      ["number", "operator"].includes(clickKind) || preferredPrimitiveId
        ? defaultNormalizedClick
        : this.normalizeClick(ast, defaultNormalizedClick);

    // 2. Check for negation distribution: if the clicked operator is inside a unaryOp('-'),
    // re-target to the parent unaryOp so NEG_DISTRIBUTE_* primitives can match.
    const negDistribClick = this.detectNegDistribution(ast, normalizedClick);

    // 3. Build Context
    const ctx: NodeContext = this.contextBuilder.buildContext({
      expressionId,
      ast,
      click: negDistribClick || normalizedClick,
    });

    // 4. Match
    const matches = this.matcher.match({
      table: PRIMITIVES_V5_TABLE,
      ctx,
    });

    // 5. Select
    const outcome = this.selector.select(matches);
    console.log(
      `[V5-STEPMASTER] chosenPrimitiveId=${
        outcome.primitive?.id ?? "none"
      } operator=${ctx.operatorLatex ?? "?"} kind=${outcome.kind} score=${
        outcome.matches[0]?.score ?? 0
      }`
    );
    return outcome;
  }

  /**
   * Legacy Adapter: Implements the old `match` interface used by Orchestrator.
   */
  public async match(request: PrimitiveMasterRequest): Promise<PrimitiveMasterResult> {
    try {
      // Map legacy request to V5 resolvePrimitive params

      // 1. Parse
      const ast = this.astParser.parse(request.expressionLatex);
      if (!ast) {
        return {
          status: "error",
          errorCode: "parse-error",
          message: "Parse failed",
        };
      }

      // 2. Resolve Anchor (borrowing logic from old master)
      // We need to determine ClickTarget
      const clickTarget = this.resolveClickTarget(
        ast,
        request.selectionPath || "",
        request.operatorIndex
      );
      if (!clickTarget) {
        return { status: "no-match", reason: "selection-out-of-domain" };
      }

      // 3. V5 Pipeline
      const ctx = this.contextBuilder.buildContext({
        expressionId: request.expressionId || "unknown",
        ast,
        click: clickTarget,
      });

      const matches = this.matcher.match({
        table: PRIMITIVES_V5_TABLE,
        ctx,
      });

      const outcome = this.selector.select(matches);

      // 4. Map to Legacy Result
      if (outcome.kind === "no-candidates" || !outcome.primitive) {
        return {
          status: "no-match",
          reason: "no-primitive-for-selection",
          debug: {
            candidates: outcome.matches.map((m) => ({
              primitiveId: m.row.id,
              verdict: "not-applicable",
            })),
          },
        };
      }

      // Note: Legacy `window` logic was simple.
      const centerPath = ctx.nodeId;
      const window: PrimitiveMasterWindow = {
        centerPath,
        latexFragment: this.astUtils.toLatex(ast), // Approximate
      };

      const debugCandidates: PrimitiveMasterDebugCandidate[] = outcome.matches.map((m) => ({
        primitiveId: m.row.id,
        verdict: "applicable",
        reason: `Score: ${m.score}`,
      }));

      // For now, return "match-found" with the chosen primitive ID.

      return {
        status: "match-found",
        primitiveId: outcome.primitive.id,
        window,
        debug: { candidates: debugCandidates },
      };
    } catch (e: any) {
      return {
        status: "error",
        errorCode: "internal-error",
        message: e.message,
      };
    }
  }

  public resolveClickTarget(
    ast: AstNode,
    selectionPath: string,
    operatorIndex?: number,
    frontendOperator?: string
  ): { nodeId: string; kind: any; operatorIndex?: number } | undefined {
    // Normalize the frontend operator for comparison
    // Frontend uses unicode chars (⋅, −, ×) while backend uses LaTeX ops (+, -, *, \cdot, \times)
    const normalizedFrontendOp = this.normalizeFrontendOperator(frontendOperator);

    // 1. Try Operator Index
    if (typeof operatorIndex === "number") {
      const found = this.astUtils.getNodeByOperatorIndex(ast, operatorIndex);
      if (found) {
        // 1a. Verify operator matches if frontend provided one
        const foundOp = (found.node as any).op;
        if (!normalizedFrontendOp || this.operatorsMatch(foundOp, normalizedFrontendOp)) {
          return {
            nodeId: found.path,
            kind: this.classifyNode(found.node),
            operatorIndex,
          };
        }
        // Operator mismatch: the frontend and backend count operators differently
        // (e.g. visual minus in \frac{-3}{4}). Search for the correct one.
        console.log(
          `[V5-CLICK] operatorIndex ${operatorIndex} found '${foundOp}' but frontend expects '${normalizedFrontendOp}'. Searching...`
        );
      }

      // 1b. Fallback: Search all operator indices to find one matching the frontend operator
      if (normalizedFrontendOp) {
        for (let idx = 0; idx < 20; idx++) {
          const candidate = this.astUtils.getNodeByOperatorIndex(ast, idx);
          if (!candidate) break; // No more operators
          const candidateOp = (candidate.node as any).op;
          if (this.operatorsMatch(candidateOp, normalizedFrontendOp)) {
            console.log(
              `[V5-CLICK] Found matching operator '${candidateOp}' at index ${idx} (frontend sent ${operatorIndex})`
            );
            return {
              nodeId: candidate.path,
              kind: this.classifyNode(candidate.node),
              operatorIndex: idx,
            };
          }
        }
      }

      // 1c. Final fallback: try lower indices (for when no frontend operator provided)
      if (operatorIndex > 0 && !normalizedFrontendOp) {
        for (let fallbackIdx = operatorIndex - 1; fallbackIdx >= 0; fallbackIdx--) {
          const fallback = this.astUtils.getNodeByOperatorIndex(ast, fallbackIdx);
          if (fallback) {
            console.log(
              `[V5-CLICK] operatorIndex ${operatorIndex} not found, falling back to ${fallbackIdx}`
            );
            return {
              nodeId: fallback.path,
              kind: this.classifyNode(fallback.node),
              operatorIndex: fallbackIdx,
            };
          }
        }
      }
    }

    // 2. Try Path
    if (selectionPath) {
      const cleanPath = selectionPath.replace(/\.op$/, "");
      const node = this.astUtils.getNodeAt(ast, cleanPath);
      if (node) {
        return {
          nodeId: cleanPath,
          kind: this.classifyNode(node),
        };
      }
    }
    return undefined;
  }

  /**
   * Normalize frontend operator unicode characters to backend operator strings.
   */
  private normalizeFrontendOperator(op?: string): string | undefined {
    if (!op) return undefined;
    const map: Record<string, string> = {
      "⋅": "\\cdot",
      "×": "\\times",
      "÷": "\\div",
      "−": "-",
      "+": "+",
      "-": "-",
      "*": "*",
      "/": "/",
    };
    return map[op] || op;
  }

  /**
   * Check if two operator strings refer to the same operation.
   */
  private operatorsMatch(astOp: string, frontendOp: string): boolean {
    if (astOp === frontendOp) return true;
    // Multiplication variants
    const mulOps = ["*", "\\cdot", "\\times", "⋅", "×"];
    if (mulOps.includes(astOp) && mulOps.includes(frontendOp)) return true;
    // Subtraction/negation variants
    const subOps = ["-", "−"];
    if (subOps.includes(astOp) && subOps.includes(frontendOp)) return true;
    // Division variants
    const divOps = ["/", "\\div", "÷"];
    if (divOps.includes(astOp) && divOps.includes(frontendOp)) return true;
    return false;
  }

  private classifyNode(node: AstNode): "operator" | "number" | "fractionBar" | "bracket" | "other" {
    if (node.type === "binaryOp") return "operator";
    if (node.type === "unaryOp") return "operator";
    if (node.type === "fraction") return "operator";
    if (node.type === "integer") return "number";
    if (node.type === "mixed") return "number";
    return "other";
  }

  /**
   * Detects if a click targets a binary operator inside a unaryOp('-').
   * If so, returns a new click target pointing to the parent unaryOp
   * so that NEG_DISTRIBUTE_* primitives can match.
   *
   * Example: For -(3/4 - 1/8), clicking the inner '-' should resolve to the outer unary '-'
   * so that the negation can be distributed: -(a - b) -> -a + b
   */
  private detectNegDistribution(
    ast: AstNode,
    click: { nodeId: string; kind: string; operatorIndex?: number }
  ): { nodeId: string; kind: any; operatorIndex?: number } | null {
    // Only applies to operator clicks
    if (click.kind !== "operator") return null;

    // Get the clicked node
    const node = this.astUtils.getNodeAt(ast, click.nodeId);
    if (!node || node.type !== "binaryOp") return null;
    if (node.op !== "+" && node.op !== "-") return null;

    // Check if the parent is a unaryOp('-')
    const parentPath = this.getParentPath(click.nodeId);
    if (!parentPath) return null;

    const parentNode = parentPath === "root" ? ast : this.astUtils.getNodeAt(ast, parentPath);
    if (!parentNode || parentNode.type !== "unaryOp" || parentNode.op !== "-") return null;

    // The parent is a unaryOp('-') containing this binary operator.
    // Re-target the click to the parent unaryOp for negation distribution.
    console.log(
      `[V5-NEG-DETECT] Detected negation distribution: binary '${node.op}' inside unaryOp('-'). Re-targeting from '${click.nodeId}' to '${parentPath}'`
    );

    return {
      nodeId: parentPath,
      kind: "operator",
      operatorIndex: click.operatorIndex,
    };
  }

  /**
   * Gets the parent path for a given node path.
   * Returns null if the node is at root level.
   */
  private getParentPath(nodeId: string): string | null {
    if (nodeId === "root" || nodeId === "") return null;

    const lastDotIndex = nodeId.lastIndexOf(".");
    if (lastDotIndex === -1) {
      // nodeId is like "argument", "term[0]" — parent is root
      return "root";
    }
    return nodeId.substring(0, lastDotIndex);
  }

  private normalizeClick(
    ast: AstNode,
    click: { nodeId: string; kind: string; operatorIndex?: number }
  ): { nodeId: string; kind: any; operatorIndex?: number } {
    // Only normalize numbers/integers
    if (click.kind !== "number" && click.kind !== "integer") return click;

    // Determine parent path
    let parentPath = "";
    if (click.nodeId === "root") return click; // Root cannot have parent

    const lastDotIndex = click.nodeId.lastIndexOf(".");
    if (lastDotIndex === -1) {
      parentPath = "root";
    } else {
      parentPath = click.nodeId.substring(0, lastDotIndex);
    }

    const parentNode = this.astUtils.getNodeAt(ast, parentPath);
    if (parentNode && parentNode.type === "binaryOp") {
      if (["+", "-", "*", "/", "\\times", "\\div"].includes(parentNode.op)) {
        const normalized = {
          nodeId: parentPath,
          kind: "operator" as const,
          operatorIndex: click.operatorIndex,
        };

        console.log(
          `[V5-TARGET] rawKind=${click.kind}, parentKind=${parentNode.type}, normalizedKind=operator, normalizedNodeId=${normalized.nodeId}`
        );
        return normalized;
      }
    }
    return click;
  }
}

// Factory for backward compatibility
export function createPrimitiveMaster(): PrimitiveMaster {
  return container.resolve(PrimitiveMaster);
}
