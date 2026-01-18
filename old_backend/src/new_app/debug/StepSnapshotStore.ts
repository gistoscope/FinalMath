/**
 * StepSnapshotStore Class
 *
 * Stores step execution snapshots for debugging.
 *
 * Responsibilities:
 *  - Store step execution details
 *  - Retrieve snapshots by session or step ID
 *  - Support debugging workflows
 */

export interface StepSnapshot {
  id: string;
  sessionId: string;
  timestamp: number;
  expressionBefore: string;
  expressionAfter?: string;
  primitiveId?: string;
  targetPath?: string;
  status: "pending" | "success" | "error";
  debugData?: Record<string, unknown>;
}

/**
 * StepSnapshotStore - Step snapshot storage
 */
export class StepSnapshotStore {
  private static snapshots: Map<string, StepSnapshot> = new Map();
  private static sessionIndex: Map<string, string[]> = new Map();
  private static maxSnapshots = 500;

  /**
   * Store a step snapshot.
   */
  static store(snapshot: StepSnapshot): void {
    this.snapshots.set(snapshot.id, snapshot);

    // Update session index
    const sessionSnapshots = this.sessionIndex.get(snapshot.sessionId) || [];
    sessionSnapshots.push(snapshot.id);
    this.sessionIndex.set(snapshot.sessionId, sessionSnapshots);

    // Limit storage
    if (this.snapshots.size > this.maxSnapshots) {
      const oldest = this.snapshots.keys().next().value;
      if (oldest) {
        this.snapshots.delete(oldest);
      }
    }
  }

  /**
   * Get a snapshot by ID.
   */
  static get(id: string): StepSnapshot | undefined {
    return this.snapshots.get(id);
  }

  /**
   * Get all snapshots for a session.
   */
  static getBySession(sessionId: string): StepSnapshot[] {
    const ids = this.sessionIndex.get(sessionId) || [];
    return ids
      .map((id) => this.snapshots.get(id))
      .filter((s): s is StepSnapshot => s !== undefined);
  }

  /**
   * Update a snapshot.
   */
  static update(id: string, updates: Partial<StepSnapshot>): boolean {
    const existing = this.snapshots.get(id);
    if (!existing) return false;

    this.snapshots.set(id, { ...existing, ...updates });
    return true;
  }

  /**
   * Clear all snapshots.
   */
  static clear(): void {
    this.snapshots.clear();
    this.sessionIndex.clear();
  }

  /**
   * Get count of stored snapshots.
   */
  static count(): number {
    return this.snapshots.size;
  }
}
