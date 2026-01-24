// core/state.ts
// Centralized state management for the viewer application

// ============================================================
// MODE CONSTANTS
// ============================================================
export const MODE_GREEN = 0;
export const MODE_ORANGE = 1;
export const MODE_BLUE = 2;

export interface ModeConfig {
  mode: number;
  color: string;
  label: string;
  primitiveId: string | null;
}

export const MODE_CONFIG: ModeConfig[] = [
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

export const P1_DOUBLE_CLICK_THRESHOLD = 350;

// ============================================================
// TEST EXPRESSIONS
// ============================================================
export const TESTS: string[] = [
  String.raw`\frac{1}{7} + \frac{3}{7}`,
  String.raw`\frac{5}{9} - \frac{2}{9}`,
  String.raw`2+3`,
  String.raw`\frac{1}{3}+\frac{2}{5}`,
  String.raw`\frac{1}{1+\frac{1}{2}}`,
  String.raw`-\left(\frac{3}{4}-\frac{1}{8}\right)`,
  String.raw`12.5 + 0.75 - 3.125`,
  String.raw`1\frac{2}{3} + 2\frac{1}{5}`,
  String.raw`2 + 3 - 1`,
  String.raw`\frac{1}{2} + \frac{1}{3} + \frac{1}{6}`,
  String.raw`\left(1-\frac{1}{3}\right)\cdot\frac{3}{4}`,
  String.raw`\frac{2}{5} - \left(\frac{1}{10}+\frac{3}{20}\right)`,
  String.raw`\left(\frac{1}{2}+\frac{2}{3}\right)-\left(\frac{3}{4}-\frac{1}{5}\right)`,
  String.raw`1.2 + \frac{3}{5} - 0.4`,
  String.raw`\frac{1}{2} + \left(\frac{3}{4} - \frac{1}{1+\frac{1}{2}}\right)`,
  String.raw`\left(\frac{5}{6} - \frac{1}{3}\right) + \frac{7}{8}`,
];

// ============================================================
// APPLICATION STATE
// ============================================================

import { SurfaceNode } from "../surface-map/surface-node";

/**
 * Primitive definition for integer hints.
 */
export interface Primitive {
  id: string;
  label: string;
  color: string;
  targetNodeId?: string;
  isStep2?: boolean;
  oppositeDenom?: string;
  side?: string;
}

export const appState: {
  currentLatex: string;
  current: { map: { atoms: SurfaceNode[] }; serializable: unknown } | null;
  lastHoverNode: SurfaceNode | null;
} = {
  currentLatex: TESTS[0],
  current: null,
  lastHoverNode: null,
};

export const selectionState: {
  mode: string;
  primaryId: string | null;
  selectedIds: Set<string>;
} = {
  mode: "none",
  primaryId: null,
  selectedIds: new Set<string>(),
};

interface OperatorContext {
  astPath: string;
  getBoundingBoxes: () => unknown[];
  isComplete: () => boolean;
  leftOperandSurfaceNode: SurfaceNode | null;
  rightOperandSurfaceNode: SurfaceNode | null;
}

export const operatorSelectionState: {
  active: boolean;
  validationType: string | null;
  context: OperatorContext | null;
  boxes: unknown[];
} = {
  active: false,
  validationType: null,
  context: null,
  boxes: [],
};

export const integerCycleState: {
  selectedNodeId: string | null;
  astNodeId: string | null;
  stableKey: string | null;
  mode: number;
  isStep2Context: boolean;
  step2Info: unknown;
  primitives: Primitive[];
  cycleIndex: number;
  pendingClickTimeout: ReturnType<typeof setTimeout> | null;
  lastClickTime: number;
  lastClickNodeId: string | null;
  dblclickLockUntil: number;
} = {
  selectedNodeId: null,
  astNodeId: null,
  stableKey: null,
  mode: MODE_GREEN,
  isStep2Context: false,
  step2Info: null,
  primitives: [
    { id: "P.INT_TO_FRAC", label: "Convert to fraction", color: "#4CAF50" },
    { id: "P.INT_FACTOR_PRIMES", label: "Factor to primes", color: "#FF9800" },
  ],
  cycleIndex: 0,
  pendingClickTimeout: null,
  lastClickTime: 0,
  lastClickNodeId: null,
  dblclickLockUntil: 0,
};

export const hintApplyState = { applying: false };

export const perTokenModeMap = new Map<string, unknown>();

export const stableIdState: {
  enabled: boolean;
  reason: string | null;
  lastExpression: string | null;
} = {
  enabled: false,
  reason: null,
  lastExpression: null,
};

export const dragState: {
  isDragging: boolean;
  dragStart: { x: number; y: number } | null;
  dragEnd: { x: number; y: number } | null;
} = {
  isDragging: false,
  dragStart: null,
  dragEnd: null,
};

export const p1DiagnosticsState = {
  currentLatex: "",
  selectedSurfaceNodeId: "N/A",
  resolvedAstNodeId: "N/A",
  primitiveId: "N/A",
  hintClickBlocked: "N/A",
  lastTestResult: "N/A",
  lastChoiceStatus: "N/A",
  lastChoiceTargetPath: "N/A",
  lastChoiceCount: "0",
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

export function saveTokenModeState() {
  const key = integerCycleState.stableKey;
  if (!key) return;
  perTokenModeMap.set(key, {
    mode: integerCycleState.mode,
    isStep2Context: integerCycleState.isStep2Context,
    step2Info: integerCycleState.step2Info
      ? { ...(integerCycleState.step2Info as object) }
      : null,
  });
}

export function restoreTokenModeState(stableKey: string) {
  if (!stableKey || !perTokenModeMap.has(stableKey)) {
    return { mode: MODE_GREEN, isStep2Context: false, step2Info: null };
  }
  return perTokenModeMap.get(stableKey);
}

export function clearAllTokenModeState() {
  perTokenModeMap.clear();
}

export function getCurrentLatex() {
  return appState.currentLatex;
}

export function setCurrentLatex(latex: string) {
  appState.currentLatex = latex;
}
