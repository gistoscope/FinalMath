import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { MODE_GREEN, TESTS } from "../app/core/constants";
import type {
  DragState,
  IntegerCycleState,
  OperatorSelectionState,
  SelectionState,
  ViewerState,
} from "./types.store";

interface ViewerActions {
  // Formula Actions
  setLatex: (latex: string) => void;
  setIsRendering: (isRendering: boolean) => void;
  setManualInput: (input: string) => void;

  // System Actions

  setSurfaceMap: (map: object | null) => void;

  // Interaction Actions
  updateSelection: (selection: Partial<SelectionState>) => void;
  updateDrag: (drag: Partial<DragState>) => void;
  updateIntegerCycle: (cycle: Partial<IntegerCycleState>) => void;
  updateOperatorSelection: (selection: Partial<OperatorSelectionState>) => void;

  // Lifecycle
  resetState: () => void;
}

export type ViewerStore = ViewerState & { actions: ViewerActions };

const initialState: ViewerState = {
  formula: {
    latex: (TESTS as string[])[0] || "",
    isRendering: false,
  },

  system: {
    surfaceMapJson: null,
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
};

export const useViewerStore = create<ViewerStore>()(
  devtools(
    (set) => ({
      ...initialState,
      actions: {
        setLatex: (latex) =>
          set((state) => ({ formula: { ...state.formula, latex } })),
        setIsRendering: (isRendering) =>
          set((state) => ({ formula: { ...state.formula, isRendering } })),

        setSurfaceMap: (surfaceMapJson) =>
          set((state) => ({ system: { ...state.system, surfaceMapJson } })),
        updateSelection: (selection) =>
          set((state) => ({ selection: { ...state.selection, ...selection } })),
        updateDrag: (drag) =>
          set((state) => ({ drag: { ...state.drag, ...drag } })),
        updateIntegerCycle: (cycle) =>
          set((state) => ({
            integerCycle: { ...state.integerCycle, ...cycle },
          })),
        updateOperatorSelection: (selection) =>
          set((state) => ({
            operatorSelection: { ...state.operatorSelection, ...selection },
          })),
        resetState: () => set(initialState),
      },
    }),
    { name: "ViewerStore" },
  ),
);

export const useStoreActions: () => ViewerStore["actions"] = () =>
  useViewerStore((state) => state.actions);
export const useStoreState: () => ViewerStore = () =>
  useViewerStore((state) => state);
export const useFormulaState: () => ViewerStore["formula"] = () =>
  useViewerStore((state) => state.formula);
