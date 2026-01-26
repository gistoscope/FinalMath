import { useEffect } from "react";
import { getCurrentLatex } from "../app/core/state";
import {
  initializeAdapters,
  setEngineResponseCallbacks,
} from "../app/features/engine";
import { clearSelection } from "../app/features/selection";
import { useViewerStore } from "../store/useViewerStore";
import { useTsaEngine } from "./useTsaEngine";

/**
 * Hook to manage Engine lifecycle and callbacks
 */
export function useEngine() {
  const { setLatex } = useViewerStore((state) => state.actions);

  // Phase 2: Reactive Engine Status
  useTsaEngine();

  useEffect(() => {
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
  }, [setLatex]);

  return {};
}
