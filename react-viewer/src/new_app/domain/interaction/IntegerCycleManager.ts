import { inject, singleton } from "tsyringe";
import { Tokens } from "../../di/tokens";
import type { IStoreService } from "../../store/interfaces/IStoreService";

export interface Primitive {
  id: string;
  label: string;
  color: string;
  targetNodeId?: string;
  isStep2?: boolean;
}

@singleton()
export class IntegerCycleManager {
  private readonly store: IStoreService;

  constructor(@inject(Tokens.IStoreService) store: IStoreService) {
    this.store = store;
  }

  /**
   * Handle selection of a token for integer-style cycling.
   */
  public selectToken(
    stableKey: string,
    surfaceNodeId: string,
    astNodeId: string | null,
    primitives?: Primitive[],
  ) {
    const currentState = this.store.getIntegerCycle();

    // If it's a new token, reset index. If same token, we might be starting a new interaction.
    this.store.updateIntegerCycle({
      stableKey,
      selectedNodeId: surfaceNodeId,
      astNodeId,
      primitives: primitives || currentState.primitives,
      cycleIndex: 0,
      lastClickTime: Date.now(),
      lastClickNodeId: surfaceNodeId,
    });
  }

  /**
   * Move to the next primitive in the cycle.
   */
  public cycleNext(): number {
    const currentState = this.store.getIntegerCycle();
    const nextIndex =
      (currentState.cycleIndex + 1) % currentState.primitives.length;

    this.store.updateIntegerCycle({
      cycleIndex: nextIndex,
    });

    return nextIndex;
  }

  /**
   * Check if a node was recently clicked to determine if we should cycle or just select.
   */
  public wasRecentlyClicked(stableKey: string, thresholdMs: number): boolean {
    const currentState = this.store.getIntegerCycle();
    if (currentState.stableKey !== stableKey) return false;
    return Date.now() - currentState.lastClickTime < thresholdMs;
  }
}
