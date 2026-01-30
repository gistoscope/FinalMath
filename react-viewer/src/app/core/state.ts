// core/state.ts
// Centralized state management for the viewer application
import { useViewerStore } from "../../store/useViewerStore";
import { SurfaceNode } from "../surface-map/surface-node";
import {
  MODE_BLUE,
  MODE_CONFIG,
  MODE_GREEN,
  MODE_ORANGE,
  P1_DOUBLE_CLICK_THRESHOLD,
} from "./constants";

export * from "./constants";
export {
  MODE_BLUE,
  MODE_CONFIG,
  MODE_GREEN,
  MODE_ORANGE,
  P1_DOUBLE_CLICK_THRESHOLD,
};

// ============================================================
// APPLICATION STATE (Proxy Objects)
// ============================================================

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

// We keep heavy non-serializable objects here as a legacy container for now,
// but we will sync them to Zustand where possible.
export const appState = {
  get currentLatex() {
    return useViewerStore.getState().formula.latex;
  },
  set currentLatex(v: string) {
    useViewerStore.getState().actions.setLatex(v);
  },
  _current: null as {
    map: { atoms: SurfaceNode[] };
    serializable: unknown;
  } | null,
  get current() {
    return this._current;
  },
  set current(v) {
    this._current = v;
    if (v) {
      useViewerStore.getState().actions.setSurfaceMap(v.serializable as object);
    } else {
      useViewerStore.getState().actions.setSurfaceMap(null);
    }
  },
  lastHoverNode: null as SurfaceNode | null,
};

export const selectionState = {
  get mode() {
    return useViewerStore.getState().selection.mode;
  },
  set mode(v: string) {
    useViewerStore.getState().actions.updateSelection({ mode: v });
  },
  get primaryId() {
    return useViewerStore.getState().selection.primaryId;
  },
  set primaryId(v: string | null) {
    useViewerStore.getState().actions.updateSelection({ primaryId: v });
  },
  get selectedIds() {
    return useViewerStore.getState().selection.selectedIds;
  },
  set selectedIds(v: Set<string>) {
    useViewerStore.getState().actions.updateSelection({ selectedIds: v });
  },
};

export const operatorSelectionState = {
  get active() {
    return useViewerStore.getState().operatorSelection.active;
  },
  set active(v: boolean) {
    useViewerStore.getState().actions.updateOperatorSelection({ active: v });
  },
  get validationType() {
    return useViewerStore.getState().operatorSelection.validationType;
  },
  set validationType(v: string | null) {
    useViewerStore
      .getState()
      .actions.updateOperatorSelection({ validationType: v });
  },
  get context() {
    return useViewerStore.getState().operatorSelection.context;
  },
  set context(v: any | null) {
    useViewerStore.getState().actions.updateOperatorSelection({ context: v });
  },
  get boxes() {
    return useViewerStore.getState().operatorSelection.boxes;
  },
  set boxes(v: any[]) {
    useViewerStore.getState().actions.updateOperatorSelection({ boxes: v });
  },
};

export const integerCycleState = {
  get selectedNodeId() {
    return useViewerStore.getState().integerCycle.selectedNodeId;
  },
  set selectedNodeId(v: string | null) {
    useViewerStore.getState().actions.updateIntegerCycle({ selectedNodeId: v });
  },
  get astNodeId() {
    return useViewerStore.getState().integerCycle.astNodeId;
  },
  set astNodeId(v: string | null) {
    useViewerStore.getState().actions.updateIntegerCycle({ astNodeId: v });
  },
  get stableKey() {
    return useViewerStore.getState().integerCycle.stableKey;
  },
  set stableKey(v: string | null) {
    useViewerStore.getState().actions.updateIntegerCycle({ stableKey: v });
  },
  get mode() {
    return useViewerStore.getState().integerCycle.mode;
  },
  set mode(v: number) {
    useViewerStore.getState().actions.updateIntegerCycle({ mode: v });
  },
  get isStep2Context() {
    return useViewerStore.getState().integerCycle.isStep2Context;
  },
  set isStep2Context(v: boolean) {
    useViewerStore.getState().actions.updateIntegerCycle({ isStep2Context: v });
  },
  get step2Info() {
    return useViewerStore.getState().integerCycle.step2Info;
  },
  set step2Info(v: any) {
    useViewerStore.getState().actions.updateIntegerCycle({ step2Info: v });
  },
  get primitives() {
    return useViewerStore.getState().integerCycle.primitives;
  },
  set primitives(v: any[]) {
    useViewerStore.getState().actions.updateIntegerCycle({ primitives: v });
  },
  get cycleIndex() {
    return useViewerStore.getState().integerCycle.cycleIndex;
  },
  set cycleIndex(v: number) {
    useViewerStore.getState().actions.updateIntegerCycle({ cycleIndex: v });
  },
  get lastClickTime() {
    return useViewerStore.getState().integerCycle.lastClickTime;
  },
  set lastClickTime(v: number) {
    useViewerStore.getState().actions.updateIntegerCycle({ lastClickTime: v });
  },
  get lastClickNodeId() {
    return useViewerStore.getState().integerCycle.lastClickNodeId;
  },
  set lastClickNodeId(v: string | null) {
    useViewerStore
      .getState()
      .actions.updateIntegerCycle({ lastClickNodeId: v });
  },
  pendingClickTimeout: null as ReturnType<typeof setTimeout> | null,
  dblclickLockUntil: 0,
};

export const hintApplyState = { applying: false };

export const perTokenModeMap = new Map<string, unknown>();

export const stableIdState = {
  enabled: false,
  reason: null as string | null,
  lastExpression: null as string | null,
};

export const dragState = {
  get isDragging() {
    return useViewerStore.getState().drag.isDragging;
  },
  set isDragging(v: boolean) {
    useViewerStore.getState().actions.updateDrag({ isDragging: v });
  },
  get dragStart() {
    return useViewerStore.getState().drag.dragStart;
  },
  set dragStart(v: { x: number; y: number } | null) {
    useViewerStore.getState().actions.updateDrag({ dragStart: v });
  },
  get dragEnd() {
    return useViewerStore.getState().drag.dragEnd;
  },
  set dragEnd(v: { x: number; y: number } | null) {
    useViewerStore.getState().actions.updateDrag({ dragEnd: v });
  },
};

export const p1DiagnosticsState = {
  get currentLatex() {
    return useViewerStore.getState().p1Diagnostics.currentLatex;
  },
  set currentLatex(v: string) {
    useViewerStore.getState().actions.updateP1Diagnostics({ currentLatex: v });
  },
  get selectedSurfaceNodeId() {
    return useViewerStore.getState().p1Diagnostics.selectedSurfaceNodeId;
  },
  set selectedSurfaceNodeId(v: string) {
    useViewerStore
      .getState()
      .actions.updateP1Diagnostics({ selectedSurfaceNodeId: v });
  },
  get resolvedAstNodeId() {
    return useViewerStore.getState().p1Diagnostics.resolvedAstNodeId;
  },
  set resolvedAstNodeId(v: string) {
    useViewerStore
      .getState()
      .actions.updateP1Diagnostics({ resolvedAstNodeId: v });
  },
  get primitiveId() {
    return useViewerStore.getState().p1Diagnostics.primitiveId;
  },
  set primitiveId(v: string) {
    useViewerStore.getState().actions.updateP1Diagnostics({ primitiveId: v });
  },
  get hintClickBlocked() {
    return useViewerStore.getState().p1Diagnostics.hintClickBlocked;
  },
  set hintClickBlocked(v: string) {
    useViewerStore
      .getState()
      .actions.updateP1Diagnostics({ hintClickBlocked: v });
  },
  get lastTestResult() {
    return useViewerStore.getState().p1Diagnostics.lastTestResult;
  },
  set lastTestResult(v: string) {
    useViewerStore
      .getState()
      .actions.updateP1Diagnostics({ lastTestResult: v });
  },
  get lastChoiceStatus() {
    return useViewerStore.getState().p1Diagnostics.lastChoiceStatus;
  },
  set lastChoiceStatus(v: string) {
    useViewerStore
      .getState()
      .actions.updateP1Diagnostics({ lastChoiceStatus: v });
  },
  get lastChoiceTargetPath() {
    return useViewerStore.getState().p1Diagnostics.lastChoiceTargetPath;
  },
  set lastChoiceTargetPath(v: string) {
    useViewerStore
      .getState()
      .actions.updateP1Diagnostics({ lastChoiceTargetPath: v });
  },
  get lastChoiceCount() {
    return useViewerStore.getState().p1Diagnostics.lastChoiceCount;
  },
  set lastChoiceCount(v: string) {
    useViewerStore
      .getState()
      .actions.updateP1Diagnostics({ lastChoiceCount: v });
  },
  get lastHintApplyStatus() {
    return useViewerStore.getState().p1Diagnostics.lastHintApplyStatus;
  },
  set lastHintApplyStatus(v: string) {
    useViewerStore
      .getState()
      .actions.updateP1Diagnostics({ lastHintApplyStatus: v });
  },
  get lastHintApplySelectionPath() {
    return useViewerStore.getState().p1Diagnostics.lastHintApplySelectionPath;
  },
  set lastHintApplySelectionPath(v: string) {
    useViewerStore
      .getState()
      .actions.updateP1Diagnostics({ lastHintApplySelectionPath: v });
  },
  get lastHintApplyPreferredPrimitiveId() {
    return useViewerStore.getState().p1Diagnostics
      .lastHintApplyPreferredPrimitiveId;
  },
  set lastHintApplyPreferredPrimitiveId(v: string) {
    useViewerStore
      .getState()
      .actions.updateP1Diagnostics({ lastHintApplyPreferredPrimitiveId: v });
  },
  get lastHintApplyEndpoint() {
    return useViewerStore.getState().p1Diagnostics.lastHintApplyEndpoint;
  },
  set lastHintApplyEndpoint(v: string) {
    useViewerStore
      .getState()
      .actions.updateP1Diagnostics({ lastHintApplyEndpoint: v });
  },
  get lastHintApplyNewLatex() {
    return useViewerStore.getState().p1Diagnostics.lastHintApplyNewLatex;
  },
  set lastHintApplyNewLatex(v: string) {
    useViewerStore
      .getState()
      .actions.updateP1Diagnostics({ lastHintApplyNewLatex: v });
  },
  get lastHintApplyError() {
    return useViewerStore.getState().p1Diagnostics.lastHintApplyError;
  },
  set lastHintApplyError(v: string) {
    useViewerStore
      .getState()
      .actions.updateP1Diagnostics({ lastHintApplyError: v });
  },
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
  return perTokenModeMap.get(stableKey) as any;
}

export function clearAllTokenModeState() {
  perTokenModeMap.clear();
}

export function getCurrentLatex() {
  return useViewerStore.getState().formula.latex;
}

export function setCurrentLatex(latex: string) {
  useViewerStore.getState().actions.setLatex(latex);
}
