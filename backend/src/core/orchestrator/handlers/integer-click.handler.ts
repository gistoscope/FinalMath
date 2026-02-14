/**
 * Integer Click Handler
 *
 * Handles detection and response for integer node clicks.
 * Returns a choice menu for integer-to-fraction conversion.
 */

import { injectable } from "tsyringe";
import { AstUtils } from "../../ast/utils.ast.js";
import type { StepHistory } from "../../stepmaster/step-master.types.js";
import type { OrchestratorStepResult } from "../orchestrator.types.js";
import { AstSearch } from "../utils/ast-search.util.js";
import { DebugInfoBuilder } from "../utils/debug-info.builder.js";

/**
 * Result of integer click handling
 */
export interface IntegerClickResult {
  shouldReturnChoice: boolean;
  choice?: OrchestratorStepResult;
}

/**
 * IntegerClickHandler - Detects and handles integer clicks
 */
@injectable()
export class IntegerClickHandler {
  constructor(
    private readonly astUtils: AstUtils,
    private readonly astSearch: AstSearch,
    private readonly debugInfoBuilder: DebugInfoBuilder
  ) {}

  /**
   * Handle integer click detection and return choice if applicable
   *
   * @param ast - The AST
   * @param selectionPath - The user's selection path
   * @param surfaceNodeKind - Surface-level node type hint
   * @param preferredPrimitiveId - Preferred primitive (if already chosen)
   * @param history - Current step history
   * @returns Result indicating if choice should be returned
   */
  handle(
    ast: any,
    selectionPath: string | null,
    surfaceNodeKind: string | null | undefined,
    preferredPrimitiveId: string | null | undefined,
    history: StepHistory,
    surfaceNodeId?: string | null
  ): IntegerClickResult {
    // Skip if user already made a choice
    if (preferredPrimitiveId) {
      return { shouldReturnChoice: false };
    }

    const clickedNodePath = selectionPath || "root";
    const clickedNode = this.astUtils.getNodeAt(ast, clickedNodePath);

    // Detect integer click either by AST node type OR by surfaceNodeKind
    const isIntegerByAst = clickedNode && clickedNode.type === "integer";
    const isIntegerBySurface =
      surfaceNodeKind === "Num" || surfaceNodeKind === "Number" || surfaceNodeKind === "Integer";

    if (!isIntegerByAst && !isIntegerBySurface) {
      return { shouldReturnChoice: false };
    }

    // Determine the target node ID for the choice
    let targetPath = clickedNodePath;
    let intValue: any = null;

    if (isIntegerByAst && clickedNode) {
      intValue = (clickedNode as any).value;
    } else if (isIntegerBySurface && ast) {
      // Surface says it's a number but AST path doesn't resolve to integer
      // Try surfaceNodeId first (the AST map ID from the frontend) before
      // falling back to findFirstIntegerPath, which always picks the first
      // integer in DFS order and may target the wrong node.
      let resolvedPath: string | null = null;

      if (surfaceNodeId) {
        const surfaceNode = this.astUtils.getNodeAt(ast, surfaceNodeId);
        if (surfaceNode && surfaceNode.type === "integer") {
          resolvedPath = surfaceNodeId;
        }
      }

      if (!resolvedPath) {
        resolvedPath = this.astSearch.findFirstIntegerPath(ast);
      }

      if (resolvedPath) {
        targetPath = resolvedPath;
        const intNode = this.astUtils.getNodeAt(ast, resolvedPath);
        intValue = intNode ? (intNode as any).value : null;
      }
    }

    // Build the choice response
    const choice: OrchestratorStepResult = {
      status: "choice",
      engineResult: null,
      history,
      choices: [
        {
          id: "int-to-frac",
          label: "Convert to fraction",
          primitiveId: "P.INT_TO_FRAC",
          targetNodeId: targetPath,
        },
      ],
      debugInfo: this.debugInfoBuilder.buildIntegerClickDebug({
        clickedNodePath,
        targetNodeId: targetPath,
        integerValue: intValue,
        detectedByAst: !!isIntegerByAst,
        detectedBySurface: !!isIntegerBySurface,
      }),
    };

    return {
      shouldReturnChoice: true,
      choice,
    };
  }
}
