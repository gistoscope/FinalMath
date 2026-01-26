import { useEffect } from "react";
import { formatStudentHint } from "../app/features/debug/formatters.js";
import { fileBus } from "../app/features/engine";
import { handleEngineResponse } from "../app/features/engine/response-handler.js";
import { handleClientEvent } from "../app/features/p1/integer-click-handler.js";
import { useViewerStore } from "../store/useViewerStore";

/**
 * Hook that captures engine events from the FileBus and updates the React context.
 * This effectively replaces the legacy panel-setup.js.
 */
export function useTsaEngine() {
  const { updateEngine, updateTsa, updateStepHint } = useViewerStore(
    (state) => state.actions,
  );

  useEffect(() => {
    const debugState = {
      lastClientEvent: null,
      lastEngineRequest: null,
      lastEngineResponse: null,
      lastTsa: null,
      tsaLog: [],
    };

    const unsubscribe = fileBus.subscribe((msg: any) => {
      if (!msg) return;

      switch (msg.messageType) {
        case "ClientEvent":
          debugState.lastClientEvent = msg.payload;
          handleClientEvent(msg.payload);
          break;
        case "EngineRequest":
          debugState.lastEngineRequest = msg.payload;
          break;
        case "EngineResponse": {
          const res = msg.payload;
          debugState.lastEngineResponse = res;
          // Note: handleEngineResponse updates debugState.lastTsa and debugState.tsaLog internally
          handleEngineResponse(res, debugState);
          break;
        }
        default:
          return;
      }

      // 1. Update Engine Status
      updateEngine({
        lastClientEvent: debugState.lastClientEvent,
        lastEngineRequest: debugState.lastEngineRequest,
        lastEngineResponse: debugState.lastEngineResponse,
      });

      // 2. Update TSA Strategy Info
      updateTsa({
        lastTsa: debugState.lastTsa,
        log: [...debugState.tsaLog],
      });

      // 3. Update Student Hint
      updateStepHint(formatStudentHint(debugState.lastTsa));
    });

    return unsubscribe;
  }, [updateEngine, updateTsa, updateStepHint]);
}
