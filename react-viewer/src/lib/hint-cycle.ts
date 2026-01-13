/**
 * hint-cycle.ts - State-driven hint cycle manager
 *
 * Manages hint cycling state keyed by stableKey to avoid captured-state bugs.
 * Single source of truth for current selection and primitive.
 */

export interface Primitive {
  id: string;
  label: string;
  color: string;
  targetNodeId?: string;
  isStep2?: boolean;
  oppositeDenom?: string;
  side?: string;
  primitiveId?: string; // Sometimes configured as primitiveId
}

export interface HintCycleEntry {
  stableKey: string;
  surfaceNodeId: string;
  astNodeId: string | null;
  cycleIndex: number;
  primitives: Primitive[];
  lastClickTime: number;
}

export interface HintCycleState {
  stableKey: string | null;
  astNodeId: string | null;
  surfaceNodeId: string | null;
  cycleIndex: number;
  primitive: Primitive | null;
}

// Default primitives for integers
const DEFAULT_INTEGER_PRIMITIVES: Primitive[] = [
  { id: "P.INT_TO_FRAC", label: "Convert to fraction", color: "#4CAF50" }, // Green
  { id: "P.INT_FACTOR_PRIMES", label: "Factor to primes", color: "#FF9800" }, // Orange
];

// State storage keyed by stableKey
const hintCycleEntries = new Map<string, HintCycleEntry>();

// Currently active entry
let activeStableKey: string | null = null;

// Prevent re-entry
let applying = false;

/**
 * Get or create entry for stableKey
 */
function getEntry(stableKey: string | null): HintCycleEntry | null {
  if (!stableKey) return null;
  return hintCycleEntries.get(stableKey) || null;
}

/**
 * Get the currently active entry
 */
function getActiveEntry(): HintCycleEntry | null {
  if (!activeStableKey) return null;
  return getEntry(activeStableKey);
}

/**
 * Select a token for hint cycling
 */
function selectToken(
  stableKey: string,
  surfaceNodeId: string,
  astNodeId: string | null,
  primitives: Primitive[] | null = null
) {
  if (!stableKey) {
    console.warn("[HintCycle] selectToken called with null stableKey");
    return;
  }

  let entry = hintCycleEntries.get(stableKey);

  if (!entry) {
    // New entry
    entry = {
      stableKey,
      surfaceNodeId,
      astNodeId,
      cycleIndex: 0,
      primitives: primitives || [...DEFAULT_INTEGER_PRIMITIVES],
      lastClickTime: Date.now(),
    };
    hintCycleEntries.set(stableKey, entry);
    console.log(`[HintCycle] Created entry for stableKey=${stableKey}, mode=0`);
  } else {
    // Update existing
    entry.surfaceNodeId = surfaceNodeId;
    entry.astNodeId = astNodeId || entry.astNodeId;
    if (primitives) {
      entry.primitives = primitives;
    }
    entry.lastClickTime = Date.now();
  }

  activeStableKey = stableKey;
}

/**
 * Cycle to next mode for active token
 */
function cycleNext(): number {
  const entry = getActiveEntry();
  if (!entry) {
    console.warn("[HintCycle] cycleNext: no active entry");
    return 0;
  }

  entry.cycleIndex = (entry.cycleIndex + 1) % entry.primitives.length;
  console.log(
    `[HintCycle] Cycled to mode=${entry.cycleIndex} (${
      entry.primitives[entry.cycleIndex]?.id
    })`
  );
  return entry.cycleIndex;
}

/**
 * Get current primitive for active entry
 */
function getCurrentPrimitive(): Primitive | null {
  const entry = getActiveEntry();
  if (!entry) return null;
  return entry.primitives[entry.cycleIndex] || null;
}

/**
 * Get current state for active entry
 */
function getCurrentState(): HintCycleState {
  const entry = getActiveEntry();
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

/**
 * Update primitives for active entry (backend choices)
 */
function setPrimitives(primitives: Primitive[]) {
  const entry = getActiveEntry();
  if (!entry) return;
  entry.primitives = primitives;
  // Clamp cycleIndex
  if (entry.cycleIndex >= primitives.length) {
    entry.cycleIndex = 0;
  }
}

/**
 * Update astNodeId for active entry
 */
function setAstNodeId(astNodeId: string) {
  const entry = getActiveEntry();
  if (!entry) return;
  entry.astNodeId = astNodeId;
}

/**
 * Check if same token was recently clicked (for double-click detection)
 */
function wasRecentlyClicked(stableKey: string, thresholdMs: number): boolean {
  if (activeStableKey !== stableKey) return false;
  const entry = getEntry(stableKey);
  if (!entry) return false;
  return Date.now() - entry.lastClickTime < thresholdMs;
}

/**
 * Reset state (on expression change)
 */
function reset() {
  hintCycleEntries.clear();
  activeStableKey = null;
  applying = false;
  console.log("[HintCycle] Reset");
}

/**
 * Check/set applying lock
 */
function isApplying() {
  return applying;
}
function setApplying(val: boolean) {
  applying = val;
}

// Export module
export const HintCycle = {
  getEntry,
  getActiveEntry,
  selectToken,
  cycleNext,
  getCurrentPrimitive,
  getCurrentState,
  setPrimitives,
  setAstNodeId,
  wasRecentlyClicked,
  reset,
  isApplying,
  setApplying,
  DEFAULT_PRIMITIVES: DEFAULT_INTEGER_PRIMITIVES,
};
