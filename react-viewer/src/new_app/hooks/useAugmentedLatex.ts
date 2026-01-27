/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Tokens } from "../di/tokens";
import { MathEngine } from "../domain/math/engine/MathEngine";
import { useService } from "../useService";

export interface AugmentedLatexState {
  instrumentedLatex: string;
  isLoading: boolean;
  error: string | null;
}

export function useAugmentedLatex(latex: string): AugmentedLatexState {
  const mathEngine = useService<MathEngine>(Tokens.IMathEngine);

  const [state, setState] = useState<AugmentedLatexState>({
    instrumentedLatex: latex,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function process() {
      if (!latex) return;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const result = await mathEngine.instrumentLatex(latex);

        if (isMounted) {
          setState({
            instrumentedLatex: result.latex,
            isLoading: false,
            error: result.success ? null : result.reason || "Unknown error",
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setState({
            instrumentedLatex: latex,
            isLoading: false,
            error: err.message || "Exception during instrumentation",
          });
        }
      }
    }

    process();

    return () => {
      isMounted = false;
    };
  }, [latex, mathEngine]);

  return state;
}
