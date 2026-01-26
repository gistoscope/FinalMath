import {
  instrumentLocally,
  syncLegacyStableIdState,
} from "../app/utils/instrumentation";

export interface UseMathInstrumentationReturn {
  isLoading: boolean;
  instrumentedLatex: string;
  error: string | null;
  isStable: boolean;
}

export const processInstrumentation = (
  latex: string,
): UseMathInstrumentationReturn => {
  if (!latex)
    return {
      isLoading: false,
      instrumentedLatex: latex,
      error: null,
      isStable: false,
    };

  // 1. Local attempt
  const local = instrumentLocally(latex);
  if (local.success) {
    syncLegacyStableIdState(latex, local);
    return {
      isLoading: false,
      error: null,
      instrumentedLatex: local.latex,
      isStable: true,
    };
  }
  return {
    isLoading: false,
    error: local.reason || "Unknown error",
    instrumentedLatex: "",
    isStable: false,
  };
};
