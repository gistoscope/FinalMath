// features/debug/panel-setup.js
// Debug panel initialization and updates

import { uiBridge } from "../../services/ui-bridge";
import { handleEngineResponse } from "../engine/response-handler.js";
import { handleClientEvent } from "../p1/integer-click-handler.js";
import {
  formatClientEvent,
  formatEngineRequest,
  formatEngineResponse,
  formatStudentHint,
  formatTsaAstSize,
  formatTsaError,
  formatTsaInvariant,
  formatTsaInvariantText,
  formatTsaLog,
  formatTsaOperator,
  formatTsaStrategy,
  formatTsaWindowAfter,
  formatTsaWindowBefore,
} from "./formatters.js";

/**
 * Setup debug panel updates
 * @param {object} fileBus - FileBus instance
 */
export function setupDebugPanel(fileBus) {
  const debugState = {
    lastClientEvent: null,
    lastEngineRequest: null,
    lastEngineResponse: null,
    lastTsa: null,
    tsaLog: [],
  };

  fileBus.subscribe((msg) => {
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
        handleEngineResponse(res, debugState);
        break;
      }
      default:
        return;
    }

    // Notify React via Bridge
    uiBridge.updateEngineStatus({
      clientEvent: formatClientEvent(debugState.lastClientEvent),
      request: formatEngineRequest(debugState.lastEngineRequest),
      response: formatEngineResponse(debugState.lastEngineResponse),
    });

    uiBridge.updateTSA({
      operator: formatTsaOperator(debugState.lastTsa),
      strategy: formatTsaStrategy(debugState.lastTsa),
      invariant: formatTsaInvariant(debugState.lastTsa),
      invariantText: formatTsaInvariantText(debugState.lastTsa),
      windowBefore: formatTsaWindowBefore(debugState.lastTsa),
      windowAfter: formatTsaWindowAfter(debugState.lastTsa),
      error: formatTsaError(debugState.lastTsa),
      astSize: formatTsaAstSize(debugState.lastTsa),
    });

    uiBridge.appendLog(formatTsaLog(debugState.tsaLog));
    uiBridge.updateStepHint(formatStudentHint(debugState.lastTsa));
  });
}
