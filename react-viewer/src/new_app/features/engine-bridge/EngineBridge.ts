/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, singleton } from "tsyringe";
import { OrchestratorClient } from "../../core/api/clients/OrchestratorClient";
import type { BusMessage, IFileBus } from "../../core/interfaces/IFileBus";
import type { ILogger } from "../../core/logging/ILogger";
import { Tokens } from "../../di/tokens";
import type { IStoreService } from "../../store/interfaces/IStoreService";

export interface EngineRequest {
  type: "parse" | "previewStep" | "applyStep" | "getHints";
  clientEvent: unknown;
}

export interface EngineResponse {
  type: "ok" | "error";
  requestType: string;
  message?: string;
  result?: unknown;
  error?: {
    code: string;
    details: string;
  };
}

/**
 * EngineBridge - handles communication with the backend and synchronizes response data with the global store.
 */
import { TraceRecorder } from "../trace-hub/TraceRecorder";

@singleton()
export class EngineBridge {
  private unsubscribe: (() => void) | null = null;
  private bus: IFileBus;
  private logger: ILogger;
  private store: IStoreService;
  private orchestratorClient: OrchestratorClient;
  private traceRecorder: TraceRecorder;

  constructor(
    @inject(Tokens.IFileBus) bus: IFileBus,
    @inject(Tokens.ILogger) logger: ILogger,
    @inject(Tokens.IStoreService) store: IStoreService,
    @inject(Tokens.ITraceRecorder) traceRecorder: TraceRecorder,
    @inject(OrchestratorClient) orchestratorClient: OrchestratorClient,
  ) {
    this.bus = bus;
    this.logger = logger;
    this.store = store;
    this.traceRecorder = traceRecorder;
    this.orchestratorClient = orchestratorClient;
  }

  public start() {
    if (this.unsubscribe) return;
    this.unsubscribe = this.bus.subscribe((msg) => this.handleBusMessage(msg));
    this.logger.info("[EngineBridge] Started and listening to FileBus");
  }

  public stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  private async handleBusMessage(message: BusMessage) {
    if (!message) return;

    if (message.messageType === "ClientEvent") {
      await this._handleClientEvent(message.payload);
    } else if (message.messageType === "EngineResponse") {
      this._handleEngineResponse(message.payload as EngineResponse);
    }
  }

  private async _handleClientEvent(clientEvent: unknown) {
    if (!this._shouldSendToEngine(clientEvent)) return;

    this.traceRecorder.record("BRIDGE_CLIENT_EVENT", clientEvent);
    const request = this._toEngineRequest(clientEvent);
    this.bus.publishEngineRequest(request);

    try {
      const response = await this._processRequest(request);
      this.traceRecorder.record("BRIDGE_ENGINE_RESPONSE", response);
      this.bus.publishEngineResponse(response);
    } catch (err) {
      this.traceRecorder.record("BRIDGE_ENGINE_ERROR", err);
      this.logger.error("[EngineBridge] Orchestrator request failed", err);
    }
  }

  private _handleEngineResponse(response: EngineResponse) {
    if (response.type === "error") {
      this.logger.error(`[Engine] ${response.message}`, response.error);
      return;
    }

    const result = response.result as Record<string, any>;
    if (!result) return;

    // 1. Sync Latex if applied
    if (
      response.requestType === "applyStep" &&
      result.meta?.backendStatus === "step-applied"
    ) {
      if (result.latex) {
        this.store.setLatex(result.latex);
      }
    }

    // 2. Handle Choice Popups
    if (result.meta?.backendStatus === "choice") {
      this.store.updateEngine({
        lastEngineResponse: response,
      });
      // In a real app, we might trigger a popup service here
    }

    // 3. Update Debug Info
    this.store.updateEngine({
      lastEngineResponse: response,
    });

    if (result.meta?.tsa) {
      this.store.addLog(
        `[TSA] Applied ${result.meta.tsa.strategy || "Unknown"}`,
      );
    }
  }

  private _shouldSendToEngine(clientEvent: unknown): boolean {
    const ce = clientEvent as any;
    const t = ce?.type;
    return (
      t === "click" || t === "dblclick" || t === "applyChoice" || t === "hover"
    );
  }

  private _toEngineRequest(clientEvent: unknown): EngineRequest {
    const ce = clientEvent as any;
    let type: EngineRequest["type"] = "applyStep";

    if (ce.type === "hover") {
      type = "getHints";
    } else if (ce.type === "applyChoice") {
      type = "applyStep";
    }

    return { type, clientEvent };
  }

  private async _processRequest(
    request: EngineRequest,
  ): Promise<EngineResponse> {
    const ce = request.clientEvent as any;
    const result = await this.orchestratorClient.sendStep({
      expressionLatex: ce.latex,
      selectionPath: ce.astNodeId,
      surfaceNodeId: ce.surfaceNodeId,
      primitiveId: ce.primitiveId,
    });

    return {
      type: "ok",
      requestType: request.type,
      result,
    };
  }
}
