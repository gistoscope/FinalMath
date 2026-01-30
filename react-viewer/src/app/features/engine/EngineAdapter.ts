// features/engine/EngineAdapter.ts
// Browser EngineAdapter + StubEngine wired to FileBus.

import { runV5Step } from "../../client/orchestratorV5Client.js";
import type { BusMessage } from "../../core/FileBus";
import { FileBus } from "../../core/FileBus";
import { integerCycleState } from "../../core/state";

export interface EngineAdapterConfig {
  mode: "embedded" | "http";
  httpEndpoint?: string;
  httpTimeout?: number;
}

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
 * StubEngine - simple embedded engine for demo.
 */
export class StubEngine {
  async process(request: EngineRequest): Promise<EngineResponse> {
    const clientEvent =
      request && request.clientEvent ? request.clientEvent : {};
    const latex =
      typeof clientEvent.latex === "string" ? clientEvent.latex : "";
    const nodeId = clientEvent.surfaceNodeId;

    return {
      type: "ok",
      requestType: request.type,
      message: `Stub processed ${request.type}`,
      result: {
        latex,
        highlights: nodeId ? [String(nodeId)] : [],
        meta: {
          stub: true,
          processed: new Date().toISOString(),
        },
      },
    };
  }
}

/**
 * EngineAdapter - subscribes to ClientEvents on FileBus, emits EngineRequests
 * and EngineResponses.
 */
export class EngineAdapter {
  private bus: FileBus;
  private config: EngineAdapterConfig;
  private stubEngine: StubEngine | null;
  private unsubscribe: (() => void) | null = null;

  constructor(bus: FileBus, config?: EngineAdapterConfig) {
    this.bus = bus;
    this.config = config || { mode: "embedded" };
    this.stubEngine = this.config.mode === "embedded" ? new StubEngine() : null;

    this.handleBusMessage = this.handleBusMessage.bind(this);
  }

  start() {
    if (this.unsubscribe) return;
    this.unsubscribe = this.bus.subscribe(this.handleBusMessage);
    console.log(
      `[EngineAdapter] Started in ${this.config.mode} mode (Pure V5)`,
    );
  }

  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  async handleBusMessage(message: BusMessage) {
    if (!message || message.messageType !== "ClientEvent") return;

    const clientEvent = message.payload;
    const engineRequest = this.toEngineRequest(clientEvent);

    if (!this.shouldSendToEngine(clientEvent, engineRequest.type)) {
      return;
    }

    this.bus.publishEngineRequest(engineRequest);

    try {
      const response = await this.processRequest(engineRequest);
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
    }
  }

  shouldSendToEngine(clientEvent: any, _requestType: string): boolean {
    if (!clientEvent) return false;

    const t = clientEvent.type;

    if (t === "hover") return true;
    if (t === "selectionChanged" || t === "dragSelect") return false;

    if (t === "click" || t === "dblclick") {
      const kind = clientEvent.surfaceNodeKind || "";
      const nodeId = clientEvent.surfaceNodeId;

      const isIntegerNode =
        kind === "Num" || kind === "Number" || kind === "Integer";

      if (!nodeId) return false;

      if (isIntegerNode) {
        console.log(
          `[P1] Integer click ignored by EngineAdapter: nodeId=${nodeId}`,
        );
        return false;
      }

      const role = clientEvent.surfaceNodeRole || "";
      const isOperatorRole = role === "operator";
      const isOperatorKind =
        kind === "BinaryOp" ||
        kind === "MinusUnary" ||
        kind === "MinusBinary" ||
        kind === "Relation" ||
        kind === "Fraction";

      return isOperatorRole || isOperatorKind;
    }

    return false;
  }

  toEngineRequest(clientEvent: any): EngineRequest {
    let requestType: EngineRequest["type"] = "parse";

    switch (clientEvent && clientEvent.type) {
      case "click": {
        const isDouble =
          clientEvent.click && clientEvent.click.clickCount === 2;
        const role = clientEvent.surfaceNodeRole || "";
        const kind = clientEvent.surfaceNodeKind || "";
        const hasOpIndex = typeof clientEvent.surfaceOperatorIndex === "number";

        const isOperator =
          role === "operator" ||
          kind === "BinaryOp" ||
          kind === "MinusBinary" ||
          kind === "Relation" ||
          kind === "Fraction" ||
          kind === "FracBar" ||
          hasOpIndex;

        const isInteger =
          kind === "Num" || kind === "Number" || kind === "Integer";

        if (isDouble || isOperator || isInteger) {
          requestType = "applyStep";
        } else {
          requestType = "previewStep";
        }
        break;
      }
      case "dblclick":
        requestType = "applyStep";
        break;
      case "hover":
        requestType = "getHints";
        break;
      case "selectionChanged":
      case "dragSelect":
        requestType = "previewStep";
        break;
      default:
        requestType = "parse";
        break;
    }

    return { type: requestType, clientEvent };
  }

  async processRequest(request: EngineRequest): Promise<any> {
    if (this.config.mode === "embedded" && this.stubEngine) {
      return this.stubEngine.process(request);
    }

    const endpoint = this.config.httpEndpoint;
    if (!endpoint) {
      throw new Error("HTTP mode requires httpEndpoint in config");
    }

    if (request.type !== "applyStep") {
      return {
        type: "ok",
        requestType: request.type,
        result: {
          latex: request.clientEvent.latex,
          meta: { status: "ignored-by-v5" },
        },
      };
    }

    const timeout = this.config.httpTimeout || 8000;
    const v5Endpoint = endpoint.replace(
      "/api/entry-step",
      "/api/orchestrator/v5/step",
    );

    const v5Payload: any = {
      sessionId: `session-${Date.now()}`,
      expressionLatex: request.clientEvent.latex,
      selectionPath: request.clientEvent.astNodeId || null,
      operatorIndex: request.clientEvent.astNodeId
        ? undefined
        : request.clientEvent.surfaceOperatorIndex,
      courseId: "default",
      userRole: "student",
      surfaceNodeKind: request.clientEvent.surfaceNodeKind || null,
      clickTargetKind:
        request.clientEvent.surfaceNodeRole === "operator"
          ? "operator"
          : ["Num", "Number", "Integer"].includes(
                request.clientEvent.surfaceNodeKind,
              )
            ? "number"
            : request.clientEvent.surfaceNodeKind === "Fraction"
              ? "fractionBar"
              : null,
      operator: request.clientEvent.surfaceNodeText || null,
      surfaceNodeId: request.clientEvent.surfaceNodeId || null,
    };

    const isIntegerNode = ["Num", "Number", "Integer"].includes(
      request.clientEvent.surfaceNodeKind,
    );
    if (isIntegerNode) {
      const p1State = integerCycleState;
      const clickedSurfaceId = request.clientEvent.surfaceNodeId;
      const isSameNode = p1State.selectedNodeId === clickedSurfaceId;
      const cycleIndex = isSameNode ? p1State.cycleIndex : 0;
      const primitive = p1State.primitives[cycleIndex];

      if (primitive) {
        v5Payload.preferredPrimitiveId = primitive.id;
        let targetPath = null;
        if (isSameNode && p1State.astNodeId) {
          targetPath = p1State.astNodeId;
        } else if (request.clientEvent.astNodeId) {
          targetPath = request.clientEvent.astNodeId;
        }

        if (targetPath) {
          v5Payload.selectionPath = targetPath;
        }
      }
    }

    const v5Result = await runV5Step(v5Endpoint, v5Payload, timeout);

    if (v5Result.status === "step-applied") {
      const newLatex = v5Result.engineResult?.newExpressionLatex;
      if (newLatex) {
        return {
          type: "ok",
          requestType: request.type,
          result: {
            latex: newLatex,
            meta: {
              backendStatus: v5Result.status,
              primitiveId: v5Result.primitiveId,
              debugInfo: v5Result.rawResponse.debugInfo,
            },
          },
        };
      }
    } else if (v5Result.status === "no-candidates") {
      return {
        type: "ok",
        requestType: request.type,
        result: {
          latex: request.clientEvent.latex,
          meta: {
            backendStatus: "no-candidates",
            primitiveId: null,
          },
        },
      };
    } else if (v5Result.status === "choice") {
      return {
        type: "ok",
        requestType: request.type,
        result: {
          latex: request.clientEvent.latex,
          meta: {
            backendStatus: "choice",
            choices: v5Result.choices,
            clickContext: {
              surfaceNodeId: request.clientEvent.surfaceNodeId,
              selectionPath: request.clientEvent.astNodeId || null,
            },
          },
        },
      };
    } else if (v5Result.status === "engine-error") {
      return {
        type: "error",
        requestType: request.type,
        message: "V5 Engine Error",
        error: {
          code: "V5_ENGINE_ERROR",
          details: JSON.stringify(v5Result.rawResponse),
        },
      };
    }

    return {
      type: "ok",
      requestType: request.type,
      result: {
        latex: request.clientEvent.latex,
        meta: { status: "unknown-v5-status", raw: v5Result },
      },
    };
  }
}
