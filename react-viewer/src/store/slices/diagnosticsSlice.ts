import type { P1DiagnosticsState } from "../../types/viewer-state";
import type { ViewerSet } from "../types";

export const initialDiagnosticsState: P1DiagnosticsState = {
  currentLatex: "",
  selectedSurfaceNodeId: "N/A",
  resolvedAstNodeId: "N/A",
  primitiveId: "N/A",
  hintClickBlocked: "N/A",
  lastTestResult: "N/A",
  lastChoiceStatus: "N/A",
  lastChoiceTargetPath: "N/A",
  lastChoiceCount: "0",
  lastHintApplyStatus: "N/A",
  lastHintApplySelectionPath: "N/A",
  lastHintApplyPreferredPrimitiveId: "N/A",
  lastHintApplyEndpoint: "N/A",
  lastHintApplyNewLatex: "N/A",
  lastHintApplyError: "N/A",
};

export const createDiagnosticsActions = (set: ViewerSet) => ({
  updateP1Diagnostics: (diagnostics: Partial<P1DiagnosticsState>) =>
    set((state) => {
      state.p1Diagnostics = { ...state.p1Diagnostics, ...diagnostics };
    }),
});
