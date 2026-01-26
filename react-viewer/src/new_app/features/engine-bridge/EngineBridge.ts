/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, singleton } from "tsyringe";
import { OrchestratorClient } from "../../core/api/clients/OrchestratorClient";
import type { BusMessage, IFileBus } from "../../core/interfaces/IFileBus";
import type { ILogger } from "../../core/logging/ILogger";
import { Tokens } from "../../di/tokens";

export interface EngineRequest {
  type: "parse" | "previewStep" | "applyStep" | "getHints";
  clientEvent: any;
}

export interface EngineResponse {
  type: "ok" | "error";
  requestType: string;
  message?: string;
  result?: any;
  error?: {
    code: string;
    details: string;
  };
}

/**
 * EngineBridge - subscribes to ClientEvents on FileBus, orchestrates communication with the backend.
 */
@singleton()
export class EngineBridge {
  private unsubscribe: (() => void) | null = null;
  private bus: IFileBus;
  private logger: ILogger;
  private orchestratorClient: OrchestratorClient;

  constructor(
    @inject(Tokens.IFileBus) bus: IFileBus,
    @inject(Tokens.ILogger) logger: ILogger,
    orchestratorClient: OrchestratorClient,
  ) {
    this.bus = bus;
    this.logger = logger;
    this.orchestratorClient = orchestratorClient;
  }

  public start() {
    if (this.unsubscribe) return;
    this.unsubscribe = this.bus.subscribe((msg) => this.handleBusMessage(msg));
    this.logger.info("[EngineBridge] Started with Orchestrator connection");
  }

  public stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  private async handleBusMessage(message: BusMessage) {
    if (!message || message.messageType !== "ClientEvent") return;

    const clientEvent = message.payload;
    const engineRequest = this._toEngineRequest(clientEvent);

    if (!this._shouldSendToEngine(clientEvent)) {
      return;
    }

    this.bus.publishEngineRequest(engineRequest);

    try {
      const response = await this._processRequest(engineRequest);
      this.bus.publishEngineResponse(response);
    } catch (err) {
      const errorResponse: EngineResponse = {
        type: "error",
        requestType: engineRequest.type,
        message: "Engine processing failed",
        error: {
          code: "ENGINE_ERROR",
          details: err instanceof Error ? err.message : String(err),
        },
      };
      this.bus.publishEngineResponse(errorResponse);
      this.logger.error("[EngineBridge] Request failed", err);
    }
  }

  private _shouldSendToEngine(clientEvent: any): boolean {
    if (!clientEvent) return false;
    const t = clientEvent.type;

    if (t === "hover") return true;
    if (t === "click" || t === "dblclick") {
      const role = clientEvent.surfaceNodeRole || "";
      const kind = clientEvent.surfaceNodeKind || "";

      // Basic heuristic: send clicks on operators to engine
      return (
        role === "operator" ||
        ["BinaryOp", "Fraction", "Relation"].includes(kind)
      );
    }

    return false;
  }

  private _toEngineRequest(clientEvent: any): EngineRequest {
    let requestType: EngineRequest["type"] = "parse";

    switch (clientEvent?.type) {
      case "click":
      case "dblclick":
        requestType = "applyStep";
        break;
      case "hover":
        requestType = "getHints";
        break;
      default:
        requestType = "parse";
    }

    return { type: requestType, clientEvent };
  }

  private async _processRequest(
    request: EngineRequest,
  ): Promise<EngineResponse> {
    if (request.type === "applyStep") {
      const payload = {
        expressionLatex: request.clientEvent.latex,
        selectionPath: request.clientEvent.astNodeId || null,
        surfaceNodeId: request.clientEvent.surfaceNodeId || null,
      };

      const result = await this.orchestratorClient.sendStep(payload);
      return {
        type: "ok",
        requestType: request.type,
        result,
      };
    }

    // Default response for non-applied steps
    return {
      type: "ok",
      requestType: request.type,
      result: { status: "ignored" },
    };
  }
}
