/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from "react";
import { fileBus } from "../app/features/engine";
import { useStoreActions } from "../store/useViewerStore";

/**
 * Hook that captures engine events from the FileBus and updates the React context.
 * This effectively replaces the legacy panel-setup.js.
 */
// todo transform this to class
export function useTsaEngine() {
  const { setLatex } = useStoreActions();
  useEffect(() => {
    const unsubscribe = fileBus.subscribe((msg: any) => {
      if (!msg) return;

      switch (msg.messageType) {
        case "EngineResponse": {
          // todo remove event and do direct
          const res = msg.payload.result;

          setLatex(res.latex);
          break;
        }
        default:
          return;
      }
    });

    return unsubscribe;
  }, [setLatex]);
}
