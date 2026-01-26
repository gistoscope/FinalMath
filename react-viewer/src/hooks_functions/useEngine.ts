/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from "react";
import { getCurrentLatex } from "../app/core/state";
import {
  fileBus,
  initializeAdapters,
  setEngineResponseCallbacks,
} from "../app/features/engine";
import { clearSelection } from "../app/features/selection";
import { useViewerStore } from "../store/useViewerStore";

/**
 * Hook to manage Engine lifecycle and callbacks
 */
export function useEngine() {
  const { setLatex } = useViewerStore((state) => state.actions);

  // Phase 2: Reactive Engine Status
  // useTsaEngine();

  useEffect(() => {
    const unsubscribe = fileBus.subscribe((msg: any) => {
      if (!msg) return;

      switch (msg.messageType) {
        case "EngineResponse": {
          const res = msg.payload.result;

          setLatex(res.latex);
          break;
        }
        default:
          return;
      }
    });
    // 1. Initialize Adapters once on mount
    initializeAdapters();

    // 2. Set up the Reverse Callbacks (Engine -> App)
    setEngineResponseCallbacks(
      () => {
        const newLatex = getCurrentLatex();
        setLatex(newLatex);
      },
      () => {
        // Handled by FormulaViewer internal mapping
      },
      (reason: string) => {
        clearSelection(reason);
      },
    );

    console.log("[useEngine] Engine initialized with reactive callbacks");
    return unsubscribe;
  }, [setLatex]);

  return {};
}
