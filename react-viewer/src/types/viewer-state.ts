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
    choices: any[];
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
  | { type: "OPEN_CHOICE_POPUP"; payload: DebugUIState["choicePopup"] }
  | { type: "CLOSE_CHOICE_POPUP" }
  | { type: "UPDATE_STEP_HINT"; payload: string | null }
  | { type: "UPDATE_ENGINE"; payload: Partial<DebugUIState["engine"]> }
  | { type: "UPDATE_TSA"; payload: Partial<DebugUIState["tsa"]> }
  | { type: "ADD_LOG"; payload: string }
  | { type: "CLEAR_LOGS" }
  | { type: "SET_SURFACE_MAP"; payload: object | null }
  | { type: "SET_ACTIVE_TEST"; payload: string }
  | { type: "RESET_STATE" };
