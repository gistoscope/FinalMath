export interface StepHistoryEntry {
  id: string;
  timestamp: number;
  expressionBefore: string;
  expressionAfter: string;
  invariantRuleId?: string;
  targetPath?: string;
  primitiveIds?: string[];
}

export interface StepHistory {
  entries: StepHistoryEntry[];
}

export interface StepHistoryUpdateData {
  expressionBefore?: string;
  expressionAfter?: string;
  invariantRuleId?: string;
  targetPath?: string;
  primitiveIds?: string[];
}
