import { enableMapSet, produce } from "immer";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ViewerSet, ViewerStore } from "./types";

// Enable Map/Set plugin for Immer
enableMapSet();

// Slices
import { createDebugActions, initialDebugState } from "./slices/debugSlice";
import {
  createDiagnosticsActions,
  initialDiagnosticsState,
} from "./slices/diagnosticsSlice";
import {
  createFormulaActions,
  initialFormulaState,
} from "./slices/formulaSlice";
import {
  createInteractionActions,
  initialInteractionState,
} from "./slices/interactionSlice";
import { createSystemActions, initialSystemState } from "./slices/systemSlice";

const initialState = {
  formula: initialFormulaState,
  debug: initialDebugState,
  system: initialSystemState,
  ...initialInteractionState,
  p1Diagnostics: initialDiagnosticsState,
};

/**
 * useViewerStore
 * Composed store using manual 'produce' from Immer for maximum type safety
 * and Slice-based file organization for scalability.
 */
export const useViewerStore = create<ViewerStore>()(
  devtools(
    (set) => {
      const wrappedSet: ViewerSet = (fn) => {
        set((state) => produce(state, fn));
      };

      return {
        ...initialState,
        actions: {
          ...createFormulaActions(wrappedSet),
          ...createDebugActions(wrappedSet),
          ...createSystemActions(wrappedSet),
          ...createInteractionActions(wrappedSet),
          ...createDiagnosticsActions(wrappedSet),

          resetState: () => {
            set(initialState);
          },
        },
      };
    },
    { name: "ViewerStore" },
  ),
);
