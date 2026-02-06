import { singleton } from 'tsyringe';
import { StepHistorySnapshot } from '../step-master.types.js';
import {
  StepHistory,
  StepHistoryEntry,
  StepHistoryUpdateData,
} from './history.types.js';

@singleton()
export class StepHistoryService {
  /**
   * Create an empty history.
   */
  createEmpty(): StepHistory {
    return { entries: [] };
  }

  /**
   * Get a snapshot of the history (for decision making).
   */
  getSnapshot(history: StepHistory): StepHistorySnapshot {
    const entryCount = history.entries.length;
    const lastEntry = history.entries[entryCount - 1];

    if (!lastEntry) {
      return { entryCount: 0 };
    }

    return {
      entryCount,
      lastStep: {
        invariantRuleId: lastEntry.invariantRuleId,
        targetPath: lastEntry.targetPath,
        primitiveIds: lastEntry.primitiveIds,
        expressionBefore: lastEntry.expressionBefore,
        expressionAfter: lastEntry.expressionAfter,
      },
    };
  }

  /**
   * Append a step to the history (Pure/Immutable).
   */
  appendStep(history: StepHistory, data: StepHistoryUpdateData): StepHistory {
    const entry: StepHistoryEntry = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      expressionBefore: data.expressionBefore || '',
      expressionAfter: data.expressionAfter || '',
      invariantRuleId: data.invariantRuleId,
      targetPath: data.targetPath,
      primitiveIds: data.primitiveIds,
    };

    return {
      entries: [...history.entries, entry],
    };
  }

  /**
   * Update the last step in the history (Pure/Immutable).
   */
  updateLastStep(
    history: StepHistory,
    data: Partial<StepHistoryUpdateData>,
  ): StepHistory {
    if (history.entries.length === 0) {
      return history;
    }

    const entries = [...history.entries];
    const lastEntry = { ...entries[entries.length - 1] };

    if (data.expressionAfter !== undefined)
      lastEntry.expressionAfter = data.expressionAfter;
    if (data.expressionBefore !== undefined)
      lastEntry.expressionBefore = data.expressionBefore;
    if (data.invariantRuleId !== undefined)
      lastEntry.invariantRuleId = data.invariantRuleId;
    if (data.targetPath !== undefined) lastEntry.targetPath = data.targetPath;
    if (data.primitiveIds !== undefined)
      lastEntry.primitiveIds = data.primitiveIds;

    entries[entries.length - 1] = lastEntry;

    return { entries };
  }

  /**
   * Remove the last step from the history (Pure/Immutable).
   */
  removeLastStep(history: StepHistory): StepHistory {
    if (history.entries.length === 0) {
      return history;
    }

    return {
      entries: history.entries.slice(0, -1),
    };
  }
}
