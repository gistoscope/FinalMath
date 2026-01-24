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
  stepHint: string | null;
  engine: {
    clientEvent: string;
    request: string;
    response: string;
  };
  tsa: {
    operator: string;
    strategy: string;
    invariant: string;
    invariantText: string;
    windowBefore: string;
    windowAfter: string;
    error: string;
    astSize: number | string;
  };
}

export interface SystemState {
  logs: string[];
  surfaceMapJson: object | null;
  activeTestId: string;
}

export interface ViewerState {
  formula: FormulaState;
  debug: DebugUIState;
  system: SystemState;
}

export type ViewerAction =
  | { type: "SET_LATEX"; payload: string }
  | { type: "SET_IS_RENDERING"; payload: boolean }
  | { type: "SET_MANUAL_INPUT"; payload: string }
  | { type: "UPDATE_HOVER"; payload: Partial<DebugUIState["hover"]> }
  | { type: "UPDATE_STEP_HINT"; payload: string | null }
  | { type: "UPDATE_ENGINE"; payload: Partial<DebugUIState["engine"]> }
  | { type: "UPDATE_TSA"; payload: Partial<DebugUIState["tsa"]> }
  | { type: "ADD_LOG"; payload: string }
  | { type: "CLEAR_LOGS" }
  | { type: "SET_SURFACE_MAP"; payload: object | null }
  | { type: "SET_ACTIVE_TEST"; payload: string }
  | { type: "RESET_STATE" };
