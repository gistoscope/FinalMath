/**
 * HintCycle.ts - State-driven hint cycle manager
 */

export interface Primitive {
  id: string;
  label: string;
  color: string;
  targetNodeId?: string;
  isStep2?: boolean;
  oppositeDenom?: string;
  side?: "left" | "right";
}

export interface HintCycleEntry {
  stableKey: string;
  surfaceNodeId: string;
  astNodeId: string | null;
  cycleIndex: number;
  primitives: Primitive[];
  lastClickTime: number;
}

const DEFAULT_INTEGER_PRIMITIVES: Primitive[] = [
  { id: "P.INT_TO_FRAC", label: "Convert to fraction", color: "#4CAF50" },
  { id: "P.INT_FACTOR_PRIMES", label: "Factor to primes", color: "#FF9800" },
];

export class HintCycleManager {
  private _entries: Map<string, HintCycleEntry> = new Map();
  private _activeStableKey: string | null = null;
  private _applying: boolean = false;

  static DEFAULT_PRIMITIVES = DEFAULT_INTEGER_PRIMITIVES;

  getEntry(stableKey: string | null): HintCycleEntry | null {
    if (!stableKey) return null;
    return this._entries.get(stableKey) || null;
  }

  getActiveEntry(): HintCycleEntry | null {
    if (!this._activeStableKey) return null;
    return this.getEntry(this._activeStableKey);
  }

  selectToken(
    stableKey: string,
    surfaceNodeId: string,
    astNodeId: string | null,
    primitives: Primitive[] | null = null,
  ) {
    if (!stableKey) {
      console.warn("[HintCycle] selectToken called with null stableKey");
      return;
    }

    let entry = this._entries.get(stableKey);

    if (!entry) {
      entry = {
        stableKey,
        surfaceNodeId,
        astNodeId,
        cycleIndex: 0,
        primitives: primitives || [...DEFAULT_INTEGER_PRIMITIVES],
        lastClickTime: Date.now(),
      };
      this._entries.set(stableKey, entry);
    } else {
      entry.surfaceNodeId = surfaceNodeId;
      entry.astNodeId = astNodeId || entry.astNodeId;
      if (primitives) {
        entry.primitives = primitives;
      }
      entry.lastClickTime = Date.now();
    }

    this._activeStableKey = stableKey;
  }

  cycleNext(): number {
    const entry = this.getActiveEntry();
    if (!entry) {
      console.warn("[HintCycle] cycleNext: no active entry");
      return 0;
    }

    entry.cycleIndex = (entry.cycleIndex + 1) % entry.primitives.length;
    return entry.cycleIndex;
  }

  getCurrentPrimitive(): Primitive | null {
    const entry = this.getActiveEntry();
    if (!entry) return null;
    return entry.primitives[entry.cycleIndex] || null;
  }

  getCurrentState() {
    const entry = this.getActiveEntry();
    if (!entry) {
      return {
        stableKey: null,
        astNodeId: null,
        surfaceNodeId: null,
        cycleIndex: 0,
        primitive: null,
      };
    }
    return {
      stableKey: entry.stableKey,
      astNodeId: entry.astNodeId,
      surfaceNodeId: entry.surfaceNodeId,
      cycleIndex: entry.cycleIndex,
      primitive: entry.primitives[entry.cycleIndex] || null,
    };
  }

  setPrimitives(primitives: Primitive[]) {
    const entry = this.getActiveEntry();
    if (!entry) return;
    entry.primitives = primitives;
    if (entry.cycleIndex >= primitives.length) {
      entry.cycleIndex = 0;
    }
  }

  setAstNodeId(astNodeId: string) {
    const entry = this.getActiveEntry();
    if (!entry) return;
    entry.astNodeId = astNodeId;
  }

  wasRecentlyClicked(stableKey: string, thresholdMs: number): boolean {
    if (this._activeStableKey !== stableKey) return false;
    const entry = this.getEntry(stableKey);
    if (!entry) return false;
    return Date.now() - entry.lastClickTime < thresholdMs;
  }

  reset() {
    this._entries.clear();
    this._activeStableKey = null;
    this._applying = false;
  }

  isApplying(): boolean {
    return this._applying;
  }

  setApplying(val: boolean) {
    this._applying = val;
  }

  get activeStableKey(): string | null {
    return this._activeStableKey;
  }

  get entries(): Map<string, HintCycleEntry> {
    return this._entries;
  }
}

export const hintCycleManager = new HintCycleManager();

export const HintCycle = {
  getEntry: (stableKey: string | null) => hintCycleManager.getEntry(stableKey),
  getActiveEntry: () => hintCycleManager.getActiveEntry(),
  selectToken: (
    stableKey: string,
    surfaceNodeId: string,
    astNodeId: string | null,
    primitives: Primitive[] | null,
  ) =>
    hintCycleManager.selectToken(
      stableKey,
      surfaceNodeId,
      astNodeId,
      primitives,
    ),
  cycleNext: () => hintCycleManager.cycleNext(),
  getCurrentPrimitive: () => hintCycleManager.getCurrentPrimitive(),
  getCurrentState: () => hintCycleManager.getCurrentState(),
  setPrimitives: (primitives: Primitive[]) =>
    hintCycleManager.setPrimitives(primitives),
  setAstNodeId: (astNodeId: string) => hintCycleManager.setAstNodeId(astNodeId),
  wasRecentlyClicked: (stableKey: string, thresholdMs: number) =>
    hintCycleManager.wasRecentlyClicked(stableKey, thresholdMs),
  reset: () => hintCycleManager.reset(),
  isApplying: () => hintCycleManager.isApplying(),
  setApplying: (val: boolean) => hintCycleManager.setApplying(val),
  DEFAULT_PRIMITIVES: DEFAULT_INTEGER_PRIMITIVES,
};

if (typeof window !== "undefined") {
  (window as any).HintCycle = HintCycle;
}
