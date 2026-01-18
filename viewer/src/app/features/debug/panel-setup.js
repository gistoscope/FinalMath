// features/debug/panel-setup.js
// Debug panel initialization and updates

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
  const elDbgClient = document.getElementById("engine-debug-client");
  const elDbgReq = document.getElementById("engine-debug-request");
  const elDbgRes = document.getElementById("engine-debug-response");
  const elDbgTsaOp = document.getElementById("tsa-debug-operator");
  const elDbgTsaStrategy = document.getElementById("tsa-debug-strategy");
  const elDbgTsaInvariant = document.getElementById("tsa-debug-invariant");
  const elDbgTsaInvariantText = document.getElementById(
    "tsa-debug-invariant-text",
  );
  const elDbgTsaBefore = document.getElementById("tsa-debug-before");
  const elDbgTsaAfter = document.getElementById("tsa-debug-after");
  const elDbgTsaError = document.getElementById("tsa-debug-error");
  const elDbgTsaAstSize = document.getElementById("tsa-debug-ast-size");
  const elTsaLogOutput = document.getElementById("tsa-log-output");
  const elStudentHint = document.getElementById("tsa-student-hint");

  if (elDbgClient && elDbgReq && elDbgRes) {
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

      elDbgClient.textContent = formatClientEvent(debugState.lastClientEvent);
      elDbgReq.textContent = formatEngineRequest(debugState.lastEngineRequest);
      elDbgRes.textContent = formatEngineResponse(
        debugState.lastEngineResponse,
      );

      if (
        elDbgTsaOp &&
        elDbgTsaStrategy &&
        elDbgTsaInvariant &&
        elDbgTsaInvariantText &&
        elDbgTsaBefore &&
        elDbgTsaAfter &&
        elDbgTsaError &&
        elDbgTsaAstSize
      ) {
        elDbgTsaOp.textContent = formatTsaOperator(debugState.lastTsa);
        elDbgTsaStrategy.textContent = formatTsaStrategy(debugState.lastTsa);
        elDbgTsaInvariant.textContent = formatTsaInvariant(debugState.lastTsa);
        elDbgTsaInvariantText.textContent = formatTsaInvariantText(
          debugState.lastTsa,
        );
        elDbgTsaBefore.textContent = formatTsaWindowBefore(debugState.lastTsa);
        elDbgTsaAfter.textContent = formatTsaWindowAfter(debugState.lastTsa);
        elDbgTsaError.textContent = formatTsaError(debugState.lastTsa);
        elDbgTsaAstSize.textContent = formatTsaAstSize(debugState.lastTsa);
      }
      if (elTsaLogOutput) {
        elTsaLogOutput.textContent = formatTsaLog(debugState.tsaLog);
      }
      if (elStudentHint) {
        elStudentHint.textContent = formatStudentHint(debugState.lastTsa);
      }
    });
  }
}
