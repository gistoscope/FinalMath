// core/state.js
// Centralized state management for the viewer application

// ============================================================
// MODE CONSTANTS
// ============================================================
// P1: 3-MODE HINT CYCLE STATE MACHINE
// Mode 0 = GREEN (selection only, no apply)
// Mode 1 = ORANGE (P.INT_TO_FRAC)
// Mode 2 = BLUE (P.ONE_TO_TARGET_DENOM for Step2)
export const MODE_GREEN = 0;
export const MODE_ORANGE = 1;
export const MODE_BLUE = 2;

// Mode configurations (independent of primitives array)
export const MODE_CONFIG = [
  { mode: MODE_GREEN, color: "#4CAF50", label: "Selected", primitiveId: null },
  {
    mode: MODE_ORANGE,
    color: "#FF9800",
    label: "Convert to fraction",
    primitiveId: "P.INT_TO_FRAC",
  },
  {
    mode: MODE_BLUE,
    color: "#2196F3",
    label: "Convert 1 → target denom",
    primitiveId: "P.ONE_TO_TARGET_DENOM",
  },
];

// P1 double-click threshold in milliseconds
export const P1_DOUBLE_CLICK_THRESHOLD = 350;

// ============================================================
// TEST EXPRESSIONS
// ============================================================
export const TESTS = [
  // T14: fraction addition same denominator
  String.raw`\frac{1}{7} + \frac{3}{7}`,
  // T15: fraction subtraction same denominator
  String.raw`\frac{5}{9} - \frac{2}{9}`,
  // T0: simple integers
  String.raw`2+3`,
  // T1: simple fractions
  String.raw`\frac{1}{3}+\frac{2}{5}`,
  // T2: nested fraction
  String.raw`\frac{1}{1+\frac{1}{2}}`,
  // T3: unary minus + brackets
  String.raw`-\left(\frac{3}{4}-\frac{1}{8}\right)`,
  // T4: decimals
  String.raw`12.5 + 0.75 - 3.125`,
  // T5: mixed numbers
  String.raw`1\frac{2}{3} + 2\frac{1}{5}`,
  // T6: two integer operations
  String.raw`2 + 3 - 1`,
  // T7: three fractions
  String.raw`\frac{1}{2} + \frac{1}{3} + \frac{1}{6}`,
  // T8: brackets + multiply
  String.raw`\left(1-\frac{1}{3}\right)\cdot\frac{3}{4}`,
  // T9: subtraction with inner sum
  String.raw`\frac{2}{5} - \left(\frac{1}{10}+\frac{3}{20}\right)`,
  // T10: two bracketed groups
  String.raw`\left(\frac{1}{2}+\frac{2}{3}\right)-\left(\frac{3}{4}-\frac{1}{5}\right)`,
  // T11: mixed decimals & fractions
  String.raw`1.2 + \frac{3}{5} - 0.4`,
  // T12: stress nested
  String.raw`\frac{1}{2} + \left(\frac{3}{4} - \frac{1}{1+\frac{1}{2}}\right)`,
  // T13: extra mix
  String.raw`\left(\frac{5}{6} - \frac{1}{3}\right) + \frac{7}{8}`,
];

// ============================================================
// APPLICATION STATE
// ============================================================

// Current LaTeX expression
export const appState = {
  currentLatex: TESTS[0],
  current: null,
  lastHoverNode: null,
};

// Selection engine state
export const selectionState = {
  mode: "none", // "none" | "single" | "multi" | "rect"
  primaryId: null,
  selectedIds: new Set(),
};

// SMART OPERATOR SELECTION: State for operator + operands highlighting
export const operatorSelectionState = {
  active: false, // Whether operator selection is currently active
  validationType: null, // "direct" (GREEN) | "requires-prep" (YELLOW)
  context: null, // OperatorSelectionContext from operator-selection-context.js
  boxes: [], // Array of bounding boxes to highlight
};

// Integer cycle state for P1 hint system
export const integerCycleState = {
  selectedNodeId: null, // surfaceNodeId of currently selected integer
  astNodeId: null, // AST path of selected integer
  stableKey: null, // StableTokenKey for deduplication (astId|role|operator)
  mode: MODE_GREEN, // Current mode: 0=GREEN, 1=ORANGE, 2=BLUE
  isStep2Context: false, // True if this integer is a Step2 multiplier-1
  step2Info: null, // { side, oppositeDenom } for Step2
  // Legacy primitives array for ensureP1IntegerContext compatibility
  primitives: [
    { id: "P.INT_TO_FRAC", label: "Convert to fraction", color: "#4CAF50" },
    { id: "P.INT_FACTOR_PRIMES", label: "Factor to primes", color: "#FF9800" },
  ],
  cycleIndex: 0, // Keep for compatibility, will be derived from mode
  // Double-click detection state
  pendingClickTimeout: null,
  lastClickTime: 0,
  lastClickNodeId: null,
  dblclickLockUntil: 0, // Timestamp: suppress cycling until this time (for dblclick)
};

// P1: Prevent re-entry while hint apply is in progress
export const hintApplyState = { applying: false };

// FIX: Per-token mode storage to prevent left/right "1" sharing state
// Key: stableKey (e.g., "term[0].term[1]|number|"), Value: { mode, isStep2Context, step2Info }
export const perTokenModeMap = new Map();

// STABLE-ID: Track whether instrumentation succeeded for current formula
// When disabled, precise click actions (numbers/operators) are blocked
export const stableIdState = {
  enabled: false, // Whether Stable-ID is active for current expression
  reason: null, // Reason for failure if disabled
  lastExpression: null, // Track which expression this state applies to
};

// Drag selection state
export const dragState = {
  isDragging: false,
  dragStart: null,
  dragEnd: null,
};

// P1: Diagnostics panel state
export const p1DiagnosticsState = {
  currentLatex: "",
  selectedSurfaceNodeId: "N/A",
  resolvedAstNodeId: "N/A",
  primitiveId: "N/A",
  hintClickBlocked: "N/A",
  lastTestResult: "N/A",

  // Choice fetch (integer click) diagnostics
  lastChoiceStatus: "N/A",
  lastChoiceTargetPath: "N/A",
  lastChoiceCount: "0",

  // Hint-apply diagnostics (green hint click / double-click)
  lastHintApplyStatus: "N/A",
  lastHintApplySelectionPath: "N/A",
  lastHintApplyPreferredPrimitiveId: "N/A",
  lastHintApplyEndpoint: "N/A",
  lastHintApplyNewLatex: "N/A",
  lastHintApplyError: "N/A",
};

// ============================================================
// STATE HELPERS
// ============================================================

/**
 * Save current token's mode state to perTokenModeMap
 */
export function saveTokenModeState() {
  const key = integerCycleState.stableKey;
  if (!key) return;
  perTokenModeMap.set(key, {
    mode: integerCycleState.mode,
    isStep2Context: integerCycleState.isStep2Context,
    step2Info: integerCycleState.step2Info
      ? { ...integerCycleState.step2Info }
      : null,
  });
  console.log(
    `[STEP2-BLUE-TRACE] Saved mode=${integerCycleState.mode} for stableKey="${key}"`,
  );
}

/**
 * Restore token's mode state from perTokenModeMap, or default to GREEN
 * @param {string} stableKey
 * @returns {{ mode: number, isStep2Context: boolean, step2Info: object|null }}
 */
export function restoreTokenModeState(stableKey) {
  if (!stableKey || !perTokenModeMap.has(stableKey)) {
    return { mode: MODE_GREEN, isStep2Context: false, step2Info: null };
  }
  const saved = perTokenModeMap.get(stableKey);
  console.log(
    `[STEP2-BLUE-TRACE] Restored mode=${saved.mode} for stableKey="${stableKey}"`,
  );
  return saved;
}

/**
 * Clear all per-token mode state (on expression change)
 */
export function clearAllTokenModeState() {
  perTokenModeMap.clear();
  console.log(
    `[STEP2-BLUE-TRACE] Cleared perTokenModeMap (expression changed)`,
  );
}

/**
 * Get current LaTeX expression
 */
export function getCurrentLatex() {
  return appState.currentLatex;
}

/**
 * Set current LaTeX expression
 */
export function setCurrentLatex(latex) {
  appState.currentLatex = latex;
}
