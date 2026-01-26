export interface FormulaState {
  latex: string;
  isRendering: boolean;
}

export interface SystemState {
  surfaceMapJson: object | null;
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

export interface ViewerState {
  formula: FormulaState;
  system: SystemState;
  selection: SelectionState;
  drag: DragState;
  integerCycle: IntegerCycleState;
  operatorSelection: OperatorSelectionState;
}

export type ViewerAction =
  | { type: "SET_LATEX"; payload: string }
  | { type: "SET_IS_RENDERING"; payload: boolean }
  | { type: "SET_MANUAL_INPUT"; payload: string }
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
  | { type: "RESET_STATE" };
