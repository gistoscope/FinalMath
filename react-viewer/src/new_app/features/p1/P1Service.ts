import { inject, singleton } from "tsyringe";
import { OrchestratorClient } from "../../core/api/clients/OrchestratorClient";
import { Tokens } from "../../di/tokens";
import {
  IntegerCycleManager,
  type Primitive,
} from "../../domain/interaction/IntegerCycleManager";
import type { IStoreService } from "../../store/interfaces/IStoreService";
import { detectStep2MultiplierContext } from "./P1Utils";

@singleton()
export class P1Service {
  private readonly store: IStoreService;
  private readonly orchestrator: OrchestratorClient;
  private readonly cycleManager: IntegerCycleManager;

  constructor(
    @inject(Tokens.IStoreService) store: IStoreService,
    @inject(OrchestratorClient) orchestrator: OrchestratorClient,
    @inject(IntegerCycleManager) cycleManager: IntegerCycleManager,
  ) {
    this.store = store;
    this.orchestrator = orchestrator;
    this.cycleManager = cycleManager;
  }

  /**
   * Refreshes P1 contextual options (primitives) for the given integer.
   */
  public async ensureP1IntegerContext(
    surfaceNodeId: string,
    astNodeId: string | null = null,
  ) {
    const currentLatex = this.store.getLatex();

    this.store.updateP1Diagnostics({
      selectedSurfaceNodeId: surfaceNodeId || "N/A",
      resolvedAstNodeId: astNodeId || "MISSING",
      lastChoiceStatus: "RUNNING",
    });

    try {
      // console.log("[P1Service] ensureP1IntegerContext: fetching choices for", astNodeId);

      const payload = {
        sessionId: "default-session",
        expressionLatex: currentLatex,
        selectionPath: astNodeId,
        userRole: "student",
        userId: "student",
        courseId: "default",
        surfaceNodeKind: "Num",
      };

      const result = await this.orchestrator.runV5Step(payload);
      // console.log("[P1Service] ensureP1IntegerContext result:", result);

      if (result.status === "choice" && Array.isArray(result.choices)) {
        const choices = result.choices;
        const targetNodeId = choices[0].targetNodeId || astNodeId || null;

        const primitives: Primitive[] = choices.map(
          (
            c: { primitiveId: string; label: string; targetNodeId?: string },
            idx: number,
          ) => ({
            id: c.primitiveId,
            label: c.label,
            color: idx === 0 ? "#4CAF50" : "#FF9800",
            targetNodeId: c.targetNodeId || targetNodeId,
          }),
        );

        const step2Context = detectStep2MultiplierContext(
          targetNodeId,
          currentLatex,
        );
        if (step2Context.isStep2Context) {
          primitives.push({
            id: "P.ONE_TO_TARGET_DENOM",
            label: `Convert 1 → ${step2Context.oppositeDenom}/${step2Context.oppositeDenom}`,
            color: "#2196F3",
            targetNodeId: step2Context.path,
            isStep2: true,
          } as unknown as Primitive);
        }

        this.store.updateP1Diagnostics({
          resolvedAstNodeId: targetNodeId || "MISSING",
          lastChoiceStatus: "choice",
          lastChoiceCount: String(primitives.length),
        });

        // Sync with cycle manager
        if (targetNodeId) {
          this.cycleManager.selectToken(
            targetNodeId,
            surfaceNodeId,
            targetNodeId,
            primitives,
          );
        }

        return { astNodeId: targetNodeId, primitives };
      }

      this.store.updateP1Diagnostics({
        lastChoiceStatus: result.status || "error",
        lastHintApplyError: result.rawResponse?.error || "No choice response",
      });
    } catch (err: unknown) {
      this.store.updateP1Diagnostics({
        lastChoiceStatus: "exception",
        lastHintApplyError: err instanceof Error ? err.message : String(err),
      });
    }

    return null;
  }

  /**
   * Applies the current primitive from the cycle.
   */
  public async applyCurrentPrimitive() {
    const cycle = this.store.getIntegerCycle();
    if (!cycle.stableKey || cycle.cycleIndex === -1) return;

    const primitive = cycle.primitives[cycle.cycleIndex];
    if (!primitive) return;

    this.store.updateP1Diagnostics({
      lastHintApplyStatus: "RUNNING",
      primitiveId: primitive.id,
    });

    try {
      const payload = {
        sessionId: "default-session",
        expressionLatex: this.store.getLatex(),
        selectionPath: primitive.targetNodeId || cycle.astNodeId || "root",
        preferredPrimitiveId: primitive.id,
        courseId: "default",
        userRole: "student",
        surfaceNodeKind: "Num",
      };

      const result = await this.orchestrator.runV5Step(payload);

      if (
        result.status === "step-applied" &&
        result.engineResult?.newExpressionLatex
      ) {
        this.store.setLatex(result.engineResult.newExpressionLatex);
        this.store.updateP1Diagnostics({
          lastHintApplyStatus: "step-applied",
          lastHintApplyNewLatex: result.engineResult.newExpressionLatex,
        });
      } else {
        this.store.updateP1Diagnostics({
          lastHintApplyStatus: result.status,
          lastHintApplyError: result.rawResponse?.error || "N/A",
        });
      }
    } catch (err: unknown) {
      this.store.updateP1Diagnostics({
        lastHintApplyStatus: "exception",
        lastHintApplyError: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
