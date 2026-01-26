export interface FormulaState {
  latex: string;
  isRendering: boolean;
  manualInput: string;
}

export interface DebugUIState {
  hover: {
    target: string | null;
    lastClick: string | null;
  };
  choicePopup: {
    choices: unknown[];
    clickContext: { surfaceNodeId?: string; selectionPath?: string };
    position: { x: number; y: number };
  } | null;
  stepHint: string | null;
  engine: {
    lastClientEvent: unknown | null;
    lastEngineRequest: unknown | null;
    lastEngineResponse: unknown | null;
  };
  tsa: {
    lastTsa: unknown | null;
    log: unknown[];
  };
}

export interface SystemState {
  logs: string[];
  surfaceMapJson: object | null;
  activeTestId: string;
}

export interface SelectionState {
  mode: string;
  primaryId: string | null;
  selectedIds: Set<string>;
}

export interface DragState {
  isDragging: boolean;
  dragStart: { x: number; y: number } | null;
  dragEnd: { x: number; y: number } | null;
}

export interface IntegerCycleState {
  selectedNodeId: string | null;
  astNodeId: string | null;
  stableKey: string | null;
  mode: number;
  isStep2Context: boolean;
  step2Info: unknown;
  primitives: unknown[];
  cycleIndex: number;
  lastClickTime: number;
  lastClickNodeId: string | null;
}

export interface OperatorSelectionState {
  active: boolean;
  validationType: string | null;
  context: unknown | null;
  boxes: unknown[];
}

export interface P1DiagnosticsState {
  currentLatex: string;
  selectedSurfaceNodeId: string;
  resolvedAstNodeId: string;
  primitiveId: string;
  hintClickBlocked: string;
  lastTestResult: string;
  lastChoiceStatus: string;
  lastChoiceTargetPath: string;
  lastChoiceCount: string;
  lastHintApplyStatus: string;
  lastHintApplySelectionPath: string;
  lastHintApplyPreferredPrimitiveId: string;
  lastHintApplyEndpoint: string;
  lastHintApplyNewLatex: string;
  lastHintApplyError: string;
}

export interface ViewerState {
  formula: FormulaState;
  debug: DebugUIState;
  system: SystemState;
  selection: SelectionState;
  drag: DragState;
  integerCycle: IntegerCycleState;
  operatorSelection: OperatorSelectionState;
  p1Diagnostics: P1DiagnosticsState;
}

export type ViewerAction =
  | { type: "SET_LATEX"; payload: string }
  | { type: "SET_IS_RENDERING"; payload: boolean }
  | { type: "SET_MANUAL_INPUT"; payload: string }
  | { type: "UPDATE_HOVER"; payload: Partial<DebugUIState["hover"]> }
  | { type: "OPEN_CHOICE_POPUP"; payload: DebugUIState["choicePopup"] }
  | { type: "CLOSE_CHOICE_POPUP" }
  | { type: "UPDATE_STEP_HINT"; payload: string | null }
  | { type: "UPDATE_ENGINE"; payload: Partial<DebugUIState["engine"]> }
  | { type: "UPDATE_TSA"; payload: Partial<DebugUIState["tsa"]> }
  | { type: "ADD_LOG"; payload: string }
  | { type: "CLEAR_LOGS" }
  | { type: "SET_SURFACE_MAP"; payload: object | null }
  | { type: "SET_ACTIVE_TEST"; payload: string }
  | { type: "UPDATE_SELECTION"; payload: Partial<SelectionState> }
  | { type: "UPDATE_DRAG"; payload: Partial<DragState> }
  | { type: "UPDATE_INTEGER_CYCLE"; payload: Partial<IntegerCycleState> }
  | {
      type: "UPDATE_OPERATOR_SELECTION";
      payload: Partial<OperatorSelectionState>;
    }
  | { type: "UPDATE_P1_DIAGNOSTICS"; payload: Partial<P1DiagnosticsState> }
  | { type: "RESET_STATE" };
