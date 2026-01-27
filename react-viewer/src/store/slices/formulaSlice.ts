import { TESTS } from "../../new_app/core/constants";
import type { FormulaState } from "../../types/viewer-state";
import type { ViewerSet } from "../types";

export const initialFormulaState: FormulaState = {
  latex: (TESTS as string[])[0] || "",
  isRendering: false,
  manualInput: (TESTS as string[])[0] || "",
};

export const createFormulaActions = (set: ViewerSet) => ({
  setLatex: (latex: string) =>
    set((state) => {
      state.formula.latex = latex;
    }),
  setIsRendering: (isRendering: boolean) =>
    set((state) => {
      state.formula.isRendering = isRendering;
    }),
  setManualInput: (manualInput: string) =>
    set((state) => {
      state.formula.manualInput = manualInput;
    }),
});
