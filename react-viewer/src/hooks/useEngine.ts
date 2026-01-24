import { useEffect } from "react";
import { DebugController, setupDebugPanel } from "../app/features/debug";
import {
  fileBus,
  initializeAdapters,
  setEngineResponseCallbacks,
} from "../app/features/engine";
import { buildAndShowMap, renderFormula } from "../app/features/rendering";
import { clearSelection } from "../app/features/selection";

/**
 * Hook to manage Engine lifecycle and callbacks
 */
export function useEngine() {
  useEffect(() => {
    // 1. Initialize Adapters once on mount
    initializeAdapters();

    // 2. Set up the Reverse Callbacks (Engine -> App)
    setEngineResponseCallbacks(
      () => {
        renderFormula();
      },
      () => {
        buildAndShowMap();
      },
      (reason) => {
        clearSelection(reason);
      },
    );

    // 3. Setup debug panel
    setupDebugPanel(fileBus);
    DebugController.init();

    console.log("[useEngine] Engine and Debug initialized");
  }, []);

  return {};
}
