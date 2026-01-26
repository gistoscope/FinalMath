import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { MODE_GREEN, TESTS } from "../app/core/constants";
import type {
  DebugUIState,
  DragState,
  IntegerCycleState,
  OperatorSelectionState,
  P1DiagnosticsState,
  SelectionState,
  ViewerState,
} from "../types/viewer-state";

interface ViewerActions {
  // Formula Actions
  setLatex: (latex: string) => void;
  setIsRendering: (isRendering: boolean) => void;
  setManualInput: (input: string) => void;

  // Debug Actions
  updateHover: (hover: Partial<DebugUIState["hover"]>) => void;
  updateStepHint: (hint: string | null) => void;
  updateEngine: (engine: Partial<DebugUIState["engine"]>) => void;
  updateTsa: (tsa: Partial<DebugUIState["tsa"]>) => void;
  openChoicePopup: (popup: DebugUIState["choicePopup"]) => void;
  closeChoicePopup: () => void;

  // System Actions
  addLog: (log: string) => void;
  clearLogs: () => void;
  setSurfaceMap: (map: any | null) => void;
  setActiveTest: (testId: string) => void;

  // Interaction Actions
  updateSelection: (selection: Partial<SelectionState>) => void;
  updateDrag: (drag: Partial<DragState>) => void;
  updateIntegerCycle: (cycle: Partial<IntegerCycleState>) => void;
  updateOperatorSelection: (selection: Partial<OperatorSelectionState>) => void;

  // Diagnostics
  updateP1Diagnostics: (diagnostics: Partial<P1DiagnosticsState>) => void;

  // Lifecycle
  resetState: () => void;
}

export type ViewerStore = ViewerState & { actions: ViewerActions };

const initialState: ViewerState = {
  formula: {
    latex: (TESTS as string[])[0] || "",
    isRendering: false,
    manualInput: (TESTS as string[])[0] || "",
  },
  debug: {
    hover: { target: null, lastClick: null },
    choicePopup: null,
    stepHint: null,
    engine: {
      lastClientEvent: null,
      lastEngineRequest: null,
      lastEngineResponse: null,
    },
    tsa: {
      lastTsa: null,
      log: [],
    },
  },
  system: {
    logs: [],
    surfaceMapJson: null,
    activeTestId: "0",
  },
  selection: {
    mode: "none",
    primaryId: null,
    selectedIds: new Set<string>(),
  },
  drag: {
    isDragging: false,
    dragStart: null,
    dragEnd: null,
  },
  integerCycle: {
    selectedNodeId: null,
    astNodeId: null,
    stableKey: null,
    mode: MODE_GREEN,
    isStep2Context: false,
    step2Info: null,
    primitives: [
      { id: "P.INT_TO_FRAC", label: "Convert to fraction", color: "#4CAF50" },
      {
        id: "P.INT_FACTOR_PRIMES",
        label: "Factor to primes",
        color: "#FF9800",
      },
    ],
    cycleIndex: 0,
    lastClickTime: 0,
    lastClickNodeId: null,
  },
  operatorSelection: {
    active: false,
    validationType: null,
    context: null,
    boxes: [],
  },
  p1Diagnostics: {
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
  },
};

export const useViewerStore = create<ViewerStore>()(
  devtools(
    (set) => ({
      ...initialState,
      actions: {
        setLatex: (latex) =>
          set(
            (state) => ({ formula: { ...state.formula, latex } }),
            false,
            "setLatex",
          ),
        setIsRendering: (isRendering) =>
          set(
            (state) => ({ formula: { ...state.formula, isRendering } }),
            false,
            "setIsRendering",
          ),
        setManualInput: (manualInput) =>
          set(
            (state) => ({ formula: { ...state.formula, manualInput } }),
            false,
            "setManualInput",
          ),
        updateHover: (hover) =>
          set(
            (state) => ({
              debug: {
                ...state.debug,
                hover: { ...state.debug.hover, ...hover },
              },
            }),
            false,
            "updateHover",
          ),
        updateStepHint: (stepHint) =>
          set(
            (state) => ({ debug: { ...state.debug, stepHint } }),
            false,
            "updateStepHint",
          ),
        updateEngine: (engine) =>
          set(
            (state) => ({
              debug: {
                ...state.debug,
                engine: { ...state.debug.engine, ...engine },
              },
            }),
            false,
            "updateEngine",
          ),
        updateTsa: (tsa) =>
          set(
            (state) => ({
              debug: { ...state.debug, tsa: { ...state.debug.tsa, ...tsa } },
            }),
            false,
            "updateTsa",
          ),
        openChoicePopup: (choicePopup) =>
          set(
            (state) => ({ debug: { ...state.debug, choicePopup } }),
            false,
            "openChoicePopup",
          ),
        closeChoicePopup: () =>
          set(
            (state) => ({ debug: { ...state.debug, choicePopup: null } }),
            false,
            "closeChoicePopup",
          ),
        addLog: (log) =>
          set(
            (state) => ({
              system: { ...state.system, logs: [...state.system.logs, log] },
            }),
            false,
            "addLog",
          ),
        clearLogs: () =>
          set(
            (state) => ({ system: { ...state.system, logs: [] } }),
            false,
            "clearLogs",
          ),
        setSurfaceMap: (surfaceMapJson) =>
          set(
            (state) => ({ system: { ...state.system, surfaceMapJson } }),
            false,
            "setSurfaceMap",
          ),
        setActiveTest: (activeTestId) =>
          set(
            (state) => ({ system: { ...state.system, activeTestId } }),
            false,
            "setActiveTest",
          ),
        updateSelection: (selection) =>
          set(
            (state) => ({ selection: { ...state.selection, ...selection } }),
            false,
            "updateSelection",
          ),
        updateDrag: (drag) =>
          set(
            (state) => ({ drag: { ...state.drag, ...drag } }),
            false,
            "updateDrag",
          ),
        updateIntegerCycle: (cycle) =>
          set(
            (state) => ({ integerCycle: { ...state.integerCycle, ...cycle } }),
            false,
            "updateIntegerCycle",
          ),
        updateOperatorSelection: (selection) =>
          set(
            (state) => ({
              operatorSelection: { ...state.operatorSelection, ...selection },
            }),
            false,
            "updateOperatorSelection",
          ),
        updateP1Diagnostics: (diagnostics) =>
          set(
            (state) => ({
              p1Diagnostics: { ...state.p1Diagnostics, ...diagnostics },
            }),
            false,
            "updateP1Diagnostics",
          ),
        resetState: () => set(initialState, false, "resetState"),
      },
    }),
    { name: "ViewerStore" },
  ),
);
