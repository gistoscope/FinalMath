/**
 * hint-cycle.js - State-driven hint cycle manager
 *
 * Manages hint cycling state keyed by stableKey to avoid captured-state bugs.
 * Single source of truth for current selection and primitive.
 */

/**
 * @typedef {Object} Primitive
 * @property {string} id - Primitive ID (e.g., "P.INT_TO_FRAC")
 * @property {string} label - Display label
 * @property {string} color - CSS color
 * @property {string} [targetNodeId] - Optional AST path
 * @property {boolean} [isStep2] - True for Step 2 primitives
 * @property {string} [oppositeDenom] - For Step 2
 * @property {string} [side] - "left" or "right" for Step 2
 */

/**
 * @typedef {Object} HintCycleEntry
 * @property {string} stableKey - StableTokenKey
 * @property {string} surfaceNodeId - Surface map ID (for UI)
 * @property {string|null} astNodeId - AST path
 * @property {number} cycleIndex - Current mode index
 * @property {Primitive[]} primitives - Available primitives
 * @property {number} lastClickTime - Timestamp
 */

/**
 * Default primitives for integers.
 * @type {Primitive[]}
 */
const DEFAULT_INTEGER_PRIMITIVES = [
  { id: "P.INT_TO_FRAC", label: "Convert to fraction", color: "#4CAF50" }, // Green
  { id: "P.INT_FACTOR_PRIMES", label: "Factor to primes", color: "#FF9800" }, // Orange
];

/**
 * HintCycleManager - Class-based hint cycle state manager.
 * Manages hint cycling state keyed by stableKey.
 */
class HintCycleManager {
  /**
   * Default primitives for integers.
   * @static
   * @type {Primitive[]}
   */
  static DEFAULT_PRIMITIVES = DEFAULT_INTEGER_PRIMITIVES;

  constructor() {
    /** @type {Map<string, HintCycleEntry>} */
    this._entries = new Map();

    /** @type {string|null} */
    this._activeStableKey = null;

    /** @type {boolean} */
    this._applying = false;
  }

  /**
   * Get entry for a specific stableKey.
   * @param {string} stableKey
   * @returns {HintCycleEntry|null}
   */
  getEntry(stableKey) {
    if (!stableKey) return null;
    return this._entries.get(stableKey) || null;
  }

  /**
   * Get the currently active entry.
   * @returns {HintCycleEntry|null}
   */
  getActiveEntry() {
    if (!this._activeStableKey) return null;
    return this.getEntry(this._activeStableKey);
  }

  /**
   * Select a token for hint cycling.
   * @param {string} stableKey
   * @param {string} surfaceNodeId
   * @param {string|null} astNodeId
   * @param {Primitive[]} [primitives]
   */
  selectToken(stableKey, surfaceNodeId, astNodeId, primitives = null) {
    if (!stableKey) {
      console.warn("[HintCycle] selectToken called with null stableKey");
      return;
    }

    let entry = this._entries.get(stableKey);

    if (!entry) {
      // Create new entry
      entry = {
        stableKey,
        surfaceNodeId,
        astNodeId,
        cycleIndex: 0,
        primitives: primitives || [...DEFAULT_INTEGER_PRIMITIVES],
        lastClickTime: Date.now(),
      };
      this._entries.set(stableKey, entry);
      console.log(
        `[HintCycle] Created entry for stableKey=${stableKey}, mode=0`,
      );
    } else {
      // Update existing entry
      entry.surfaceNodeId = surfaceNodeId;
      entry.astNodeId = astNodeId || entry.astNodeId;
      if (primitives) {
        entry.primitives = primitives;
      }
      entry.lastClickTime = Date.now();
    }

    this._activeStableKey = stableKey;
  }

  /**
   * Cycle to next mode for active token.
   * @returns {number} New cycle index
   */
  cycleNext() {
    const entry = this.getActiveEntry();
    if (!entry) {
      console.warn("[HintCycle] cycleNext: no active entry");
      return 0;
    }

    entry.cycleIndex = (entry.cycleIndex + 1) % entry.primitives.length;
    console.log(
      `[HintCycle] Cycled to mode=${entry.cycleIndex} (${entry.primitives[entry.cycleIndex]?.id})`,
    );
    return entry.cycleIndex;
  }

  /**
   * Get current primitive for active entry.
   * @returns {Primitive|null}
   */
  getCurrentPrimitive() {
    const entry = this.getActiveEntry();
    if (!entry) return null;
    return entry.primitives[entry.cycleIndex] || null;
  }

  /**
   * Get current state for active entry.
   * @returns {{stableKey: string|null, astNodeId: string|null, surfaceNodeId: string|null, cycleIndex: number, primitive: Primitive|null}}
   */
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

  /**
   * Update primitives for active entry (backend choices).
   * @param {Primitive[]} primitives
   */
  setPrimitives(primitives) {
    const entry = this.getActiveEntry();
    if (!entry) return;

    entry.primitives = primitives;

    // Clamp cycleIndex if out of bounds
    if (entry.cycleIndex >= primitives.length) {
      entry.cycleIndex = 0;
    }
  }

  /**
   * Update astNodeId for active entry.
   * @param {string} astNodeId
   */
  setAstNodeId(astNodeId) {
    const entry = this.getActiveEntry();
    if (!entry) return;
    entry.astNodeId = astNodeId;
  }

  /**
   * Check if same token was recently clicked (for double-click detection).
   * @param {string} stableKey
   * @param {number} thresholdMs
   * @returns {boolean}
   */
  wasRecentlyClicked(stableKey, thresholdMs) {
    if (this._activeStableKey !== stableKey) return false;

    const entry = this.getEntry(stableKey);
    if (!entry) return false;

    return Date.now() - entry.lastClickTime < thresholdMs;
  }

  /**
   * Reset state (on expression change).
   */
  reset() {
    this._entries.clear();
    this._activeStableKey = null;
    this._applying = false;
    console.log("[HintCycle] Reset");
  }

  /**
   * Check if currently applying a primitive.
   * @returns {boolean}
   */
  isApplying() {
    return this._applying;
  }

  /**
   * Set applying lock state.
   * @param {boolean} val
   */
  setApplying(val) {
    this._applying = val;
  }

  /**
   * Get the active stable key.
   * @returns {string|null}
   */
  get activeStableKey() {
    return this._activeStableKey;
  }

  /**
   * Get all entries (for debugging).
   * @returns {Map<string, HintCycleEntry>}
   */
  get entries() {
    return this._entries;
  }
}

// Create singleton instance
const hintCycleManager = new HintCycleManager();

// Export singleton with backward-compatible interface
export const HintCycle = {
  getEntry: (stableKey) => hintCycleManager.getEntry(stableKey),
  getActiveEntry: () => hintCycleManager.getActiveEntry(),
  selectToken: (stableKey, surfaceNodeId, astNodeId, primitives) =>
    hintCycleManager.selectToken(
      stableKey,
      surfaceNodeId,
      astNodeId,
      primitives,
    ),
  cycleNext: () => hintCycleManager.cycleNext(),
  getCurrentPrimitive: () => hintCycleManager.getCurrentPrimitive(),
  getCurrentState: () => hintCycleManager.getCurrentState(),
  setPrimitives: (primitives) => hintCycleManager.setPrimitives(primitives),
  setAstNodeId: (astNodeId) => hintCycleManager.setAstNodeId(astNodeId),
  wasRecentlyClicked: (stableKey, thresholdMs) =>
    hintCycleManager.wasRecentlyClicked(stableKey, thresholdMs),
  reset: () => hintCycleManager.reset(),
  isApplying: () => hintCycleManager.isApplying(),
  setApplying: (val) => hintCycleManager.setApplying(val),
  DEFAULT_PRIMITIVES: DEFAULT_INTEGER_PRIMITIVES,
};

// Export the class for direct instantiation if needed
export { HintCycleManager };

// Also expose globally for inline scripts
if (typeof window !== "undefined") {
  window.HintCycle = HintCycle;
}
