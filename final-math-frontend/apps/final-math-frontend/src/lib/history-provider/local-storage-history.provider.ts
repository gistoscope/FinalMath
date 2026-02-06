import { HistoryProvider, StepHistory } from '@acme/math-engine';
import { injectable } from 'tsyringe';

// Ensure localStorage is recognized even if DOM lib is missing in this module's config
declare const localStorage: any;

@injectable()
export class LocalStorageHistoryProvider implements HistoryProvider {
  private readonly STORAGE_PREFIX = 'math-engine-history-';

  async getHistory(
    sessionId: string,
    _userId: string,
    _userRole: string,
  ): Promise<StepHistory> {
    try {
      if (typeof localStorage === 'undefined') {
        console.warn('LocalStorage is not available.');
        return { entries: [] };
      }

      const key = this.getStorageKey(sessionId);
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data) as StepHistory;
      }
    } catch (error) {
      console.warn('Failed to retrieve history from localStorage:', error);
    }
    return { entries: [] };
  }

  async updateHistory(sessionId: string, history: StepHistory): Promise<void> {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }
      const key = this.getStorageKey(sessionId);
      localStorage.setItem(key, JSON.stringify(history));
    } catch (error) {
      console.warn('Failed to save history to localStorage:', error);
    }
  }

  private getStorageKey(sessionId: string): string {
    return `${this.STORAGE_PREFIX}${sessionId}`;
  }
}
