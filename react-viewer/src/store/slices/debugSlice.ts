import type { DebugUIState } from "../../types/viewer-state";
import type { ViewerSet } from "../types";

export const initialDebugState: DebugUIState = {
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
};

export const createDebugActions = (set: ViewerSet) => ({
  updateHover: (hover: Partial<DebugUIState["hover"]>) =>
    set((state) => {
      state.debug.hover = { ...state.debug.hover, ...hover };
    }),
  updateStepHint: (stepHint: string | null) =>
    set((state) => {
      state.debug.stepHint = stepHint;
    }),
  updateEngine: (engine: Partial<DebugUIState["engine"]>) =>
    set((state) => {
      state.debug.engine = { ...state.debug.engine, ...engine };
    }),
  updateTsa: (tsa: Partial<DebugUIState["tsa"]>) =>
    set((state) => {
      state.debug.tsa = { ...state.debug.tsa, ...tsa };
    }),
  openChoicePopup: (choicePopup: DebugUIState["choicePopup"]) =>
    set((state) => {
      state.debug.choicePopup = choicePopup;
    }),
  closeChoicePopup: () =>
    set((state) => {
      state.debug.choicePopup = null;
    }),
});
