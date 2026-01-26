import type {
  DebugUIState,
  DragState,
  IntegerCycleState,
  OperatorSelectionState,
  P1DiagnosticsState,
  SelectionState,
  ViewerState,
} from "../types/viewer-state";

export interface ViewerActions {
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
  setSurfaceMap: (map: unknown | null) => void;
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

export type ViewerSet = (next: (state: ViewerStore) => void) => void;
