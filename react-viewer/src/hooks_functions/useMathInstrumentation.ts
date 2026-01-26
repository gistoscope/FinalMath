import { useEffect, useState } from "react";
import {
  instrumentLocally,
  instrumentViaBackend,
  syncLegacyStableIdState,
} from "../app/utils/instrumentation";

export interface UseMathInstrumentationReturn {
  isLoading: boolean;
  instrumentedLatex: string;
  error: string | null;
  isStable: boolean;
}

export function useMathInstrumentation(
  latex: string,
): UseMathInstrumentationReturn {
  const [state, setState] = useState<UseMathInstrumentationReturn>({
    isLoading: false,
    instrumentedLatex: latex,
    error: null,
    isStable: false,
  });

  useEffect(() => {
    let isMounted = true;

    async function process() {
      if (!latex) return;

      // 1. Local attempt
      const local = instrumentLocally(latex);
      if (local.success) {
        if (isMounted) {
          setState({
            isLoading: false,
            instrumentedLatex: local.latex,
            error: null,
            isStable: true,
          });
          syncLegacyStableIdState(latex, local);
        }
        return;
      }

      // 2. Local failed, try backend
      if (isMounted) {
        setState((prev) => ({ ...prev, isLoading: true }));
      }

      console.log(
        `[useMathInstrumentation] Local failed (${local.reason}) -> calling backend`,
      );
      const backend = await instrumentViaBackend(latex);

      if (isMounted) {
        setState({
          isLoading: false,
          instrumentedLatex: backend.latex,
          error: backend.success
            ? null
            : backend.reason || "Instrumentation failed",
          isStable: backend.success,
        });
        syncLegacyStableIdState(latex, backend);
      }
    }

    process();

    return () => {
      isMounted = false;
    };
  }, [latex]);

  return state;
}
