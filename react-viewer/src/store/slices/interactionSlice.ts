import { MODE_GREEN } from "../../new_app/core/constants";
import type {
  DragState,
  IntegerCycleState,
  OperatorSelectionState,
  SelectionState,
} from "../../types/viewer-state";
import type { ViewerSet } from "../types";

export const initialInteractionState = {
  selection: {
    mode: "none",
    primaryId: null,
    selectedIds: new Set<string>(),
  } as SelectionState,
  drag: {
    isDragging: false,
    dragStart: null,
    dragEnd: null,
  } as DragState,
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
  } as IntegerCycleState,
  operatorSelection: {
    active: false,
    validationType: null,
    context: null,
    boxes: [],
  } as OperatorSelectionState,
};

export const createInteractionActions = (set: ViewerSet) => ({
  updateSelection: (selection: Partial<SelectionState>) =>
    set((state) => {
      state.selection = { ...state.selection, ...selection };
    }),
  updateDrag: (drag: Partial<DragState>) =>
    set((state) => {
      state.drag = { ...state.drag, ...drag };
    }),
  updateIntegerCycle: (cycle: Partial<IntegerCycleState>) =>
    set((state) => {
      state.integerCycle = { ...state.integerCycle, ...cycle };
    }),
  updateOperatorSelection: (selection: Partial<OperatorSelectionState>) =>
    set((state) => {
      state.operatorSelection = { ...state.operatorSelection, ...selection };
    }),
});
