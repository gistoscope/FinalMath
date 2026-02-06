import { StepHistory } from '../stepmaster/step-master.types.js';

export interface HistoryProvider {
  getHistory(
    sessionId: string,
    userId: string,
    userRole: string,
  ): Promise<StepHistory>;
  updateHistory(sessionId: string, history: StepHistory): Promise<void>;
}
