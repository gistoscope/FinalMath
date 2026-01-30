/**
 * V5 Outcome Handler
 *
 * Handles V5 PrimitiveMaster outcomes (Green, Yellow, Blue, Red).
 * Converts V5 decisions into orchestrator-compatible results.
 */

import { injectable } from "tsyringe";

import { SelectedOutcome } from "@/core/primitive-master/provider/selector/selector.type.js";
import type { StepHistory } from "../../stepmaster/step-master.types.js";
import type { OrchestratorStepRequest, OrchestratorStepResult } from "../orchestrator.types.js";
import { DebugInfoBuilder } from "../utils/debug-info.builder.js";

/**
 * Result of V5 outcome handling
 */
export interface V5OutcomeResult {
  mapResult?: { candidates: any[]; resolvedSelectionPath?: string };
  earlyReturn?: OrchestratorStepResult;
  isPrimitiveMasterPath: boolean;
  pmPrimitiveId: string | null;
}

/**
 * V5OutcomeHandler - Processes V5 PrimitiveMaster outcomes
 */
@injectable()
export class V5OutcomeHandler {
  private readonly log: (message: string) => void = console.log;

  constructor(private readonly debugInfoBuilder: DebugInfoBuilder) {}

  /**
   * Handle V5 PrimitiveMaster outcome
   *
   * @param v5Outcome - The outcome from PrimitiveMaster
   * @param req - The orchestrator step request
   * @param clickTarget - The resolved click target
   * @param history - Current step history
   * @returns Result with candidates or early return
   */
  async handle(
    v5Outcome: SelectedOutcome,
    req: OrchestratorStepRequest,
    clickTarget: any,
    history: StepHistory
  ): Promise<V5OutcomeResult> {
    let mapResult: { candidates: any[]; resolvedSelectionPath?: string } | undefined;
    let isPrimitiveMasterPath = false;
    let pmPrimitiveId: string | null = null;

    // Handle based on outcome kind
    switch (v5Outcome.kind) {
      case "green-primitive":
      case "yellow-scenario":
        return this.handleGreenYellow(v5Outcome, clickTarget);

      case "blue-choice":
        return await this.handleBlueChoice(v5Outcome, req, clickTarget, history);

      case "red-diagnostic":
        return this.handleRedDiagnostic(v5Outcome, history);

      default:
        return {
          mapResult: { candidates: [] },
          isPrimitiveMasterPath: false,
          pmPrimitiveId: null,
        };
    }
  }

  /**
   * Handle GREEN/YELLOW outcomes - Auto-apply immediately
   */
  private handleGreenYellow(v5Outcome: SelectedOutcome, clickTarget: any): V5OutcomeResult {
    if (v5Outcome.primitive) {
      const pmPrimitiveId = v5Outcome.primitive.enginePrimitiveId;

      // Create a synthetic candidate for the legacy runner
      const candidate = {
        id: "v5-match",
        invariantRuleId: "v5-rule",
        primitiveIds: [pmPrimitiveId],
        targetPath:
          v5Outcome.matches?.[0]?.ctx?.actionNodeId ??
          v5Outcome.matches?.[0]?.ctx?.clickTarget?.nodeId ??
          clickTarget.nodeId,
        description: v5Outcome.primitive.label,
      };

      return {
        mapResult: {
          candidates: [candidate],
          resolvedSelectionPath: candidate.targetPath,
        },
        isPrimitiveMasterPath: true,
        pmPrimitiveId,
      };
    }

    return {
      mapResult: { candidates: [] },
      isPrimitiveMasterPath: false,
      pmPrimitiveId: null,
    };
  }

  /**
   * Handle BLUE outcomes - Ask user or apply preferred
   */
  private async handleBlueChoice(
    v5Outcome: SelectedOutcome,
    req: OrchestratorStepRequest,
    clickTarget: any,
    history: StepHistory
  ): Promise<V5OutcomeResult> {
    if (req.preferredPrimitiveId && v5Outcome.matches && v5Outcome.matches.length > 0) {
      // Find the match that corresponds to the preferred primitive
      const preferredMatch = v5Outcome.matches.find(
        (m: any) =>
          m.row.id === req.preferredPrimitiveId ||
          m.row.enginePrimitiveId === req.preferredPrimitiveId
      );

      if (preferredMatch) {
        this.log(
          `[V5OutcomeHandler] Blue Choice with preferredPrimitiveId="${req.preferredPrimitiveId}" - applying directly`
        );

        const pmPrimitiveId = preferredMatch.row.enginePrimitiveId || preferredMatch.row.id;

        // Create candidate for the runner
        const candidate = {
          id: "v5-preferred-match",
          invariantRuleId: "v5-rule",
          primitiveIds: [pmPrimitiveId],
          targetPath:
            preferredMatch.ctx?.actionNodeId ??
            preferredMatch.ctx?.clickTarget?.nodeId ??
            clickTarget.nodeId,
          description: preferredMatch.row.label || "Apply primitive",
        };

        return {
          mapResult: {
            candidates: [candidate],
            resolvedSelectionPath: candidate.targetPath,
          },
          isPrimitiveMasterPath: true,
          pmPrimitiveId,
        };
      } else {
        // Preferred primitive not found in matches
        return {
          earlyReturn: {
            status: "no-candidates",
            engineResult: {
              ok: false,
              errorCode: "preferred-primitive-not-in-candidates",
            },
            history,
            debugInfo: this.debugInfoBuilder.buildV5OutcomeDebug({
              v5Status: "preferred-not-found",
              preferredPrimitiveId: req.preferredPrimitiveId,
              availableMatches: v5Outcome.matches.map((m: any) => m.row.id),
            }),
          },
          isPrimitiveMasterPath: false,
          pmPrimitiveId: null,
        };
      }
    } else {
      // No preferredPrimitiveId - return choice to user
      this.log("[V5OutcomeHandler] Blue Choice Detected - asking user");
      return {
        earlyReturn: {
          status: "choice",
          engineResult: null,
          history,
          choices: v5Outcome.matches?.map((m: any) => ({
            id: m.row.id,
            label: m.row.label || m.row.id,
            primitiveId: m.row.enginePrimitiveId || m.row.id,
            targetNodeId: m.ctx?.clickTarget?.nodeId,
          })),
          debugInfo: this.debugInfoBuilder.buildV5OutcomeDebug({
            v5Status: "ask-user",
            options: v5Outcome.matches,
          }),
        },
        isPrimitiveMasterPath: false,
        pmPrimitiveId: null,
      };
    }
  }

  /**
   * Handle RED outcomes - Diagnostic message
   */
  private handleRedDiagnostic(v5Outcome: SelectedOutcome, history: StepHistory): V5OutcomeResult {
    this.log("[V5OutcomeHandler] Red Diagnostic Detected");
    return {
      earlyReturn: {
        status: "no-candidates",
        engineResult: null,
        history,
        debugInfo: this.debugInfoBuilder.buildV5OutcomeDebug({
          v5Status: "diagnostic",
          message: v5Outcome.primitive?.label,
        }),
      },
      isPrimitiveMasterPath: false,
      pmPrimitiveId: null,
    };
  }
}
