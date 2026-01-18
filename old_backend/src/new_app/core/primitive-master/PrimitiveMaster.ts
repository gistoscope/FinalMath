/**
 * PrimitiveMaster Class
 *
 * Coordinator for the V5 Decision Layer.
 *
 * Responsibilities:
 *  - Receive click/context from Orchestrator
 *  - Delegate to matching and selection logic
 *  - Return the appropriate primitive outcome
 */

import type {
  ClickTarget,
  PrimitiveMasterRequest,
  PrimitiveMasterResult,
  SelectedOutcome,
} from "./primitive-master.types.js";

export interface PrimitiveMasterDeps {
  parseLatexToAst: (
    latex: string,
    invariantSetId?: string,
  ) => Promise<unknown | undefined>;
  log?: (message: string) => void;
}

/**
 * PrimitiveMaster - V5 Decision Layer Coordinator
 */
export class PrimitiveMaster {
  private readonly deps: PrimitiveMasterDeps;
  private readonly log: (message: string) => void;

  constructor(deps: PrimitiveMasterDeps) {
    this.deps = deps;
    this.log = deps.log || (() => {});
  }

  /**
   * Primary V5 API: Resolves the best primitive outcome for a given click.
   */
  async resolvePrimitive(params: {
    expressionId: string;
    expressionLatex: string;
    click: ClickTarget;
    ast?: unknown;
    preferredPrimitiveId?: string;
  }): Promise<SelectedOutcome> {
    this.log(
      `[PrimitiveMaster] Resolving primitive for: ${params.click.nodeId}`,
    );

    // This is a simplified implementation
    // The full implementation would include pattern matching logic
    return {
      kind: "red-diagnostic",
      matches: [],
    };
  }

  /**
   * Legacy Adapter: Implements the old match interface.
   */
  async match(request: PrimitiveMasterRequest): Promise<PrimitiveMasterResult> {
    this.log(`[PrimitiveMaster] Matching for: ${request.expressionLatex}`);

    try {
      const ast = await this.deps.parseLatexToAst(
        request.expressionLatex,
        request.invariantSetId,
      );

      if (!ast) {
        return {
          status: "error",
          errorCode: "parse-error",
          message: "Failed to parse expression",
        };
      }

      // Simplified matching logic
      return {
        status: "no-match",
        reason: "no-primitive-for-selection",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: "error",
        errorCode: "internal-error",
        message,
      };
    }
  }

  /**
   * Resolve click target from AST and selection.
   */
  resolveClickTarget(
    ast: unknown,
    selectionPath: string,
    operatorIndex?: number,
  ): ClickTarget | undefined {
    if (!ast) return undefined;

    const kind = this.classifyNode(ast, selectionPath);
    return {
      nodeId: selectionPath || "root",
      kind,
      operatorIndex,
    };
  }

  /**
   * Classify a node type.
   */
  private classifyNode(
    _ast: unknown,
    _path: string,
  ): "operator" | "number" | "fractionBar" | "bracket" | "other" {
    // Simplified classification
    return "other";
  }
}

/**
 * Factory for backward compatibility
 */
export function createPrimitiveMaster(
  deps: PrimitiveMasterDeps,
): PrimitiveMaster {
  return new PrimitiveMaster(deps);
}
