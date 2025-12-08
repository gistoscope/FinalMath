// engine-adapter.js
// Browser EngineAdapter + StubEngine wired to FileBus.
// This follows the Claude protocol types but implemented in plain JS.

/**
 * @typedef {import("./filebus.js").FileBus} FileBus
 */

/**
 * EngineAdapterConfig
 * @typedef {{ mode: "embedded" | "http"; httpEndpoint?: string; httpTimeout?: number }} EngineAdapterConfig
 */

/**
 * StubEngine - simple embedded engine for demo.
 * It just echoes back the incoming request with a marker and optional highlight.
 */
export class StubEngine {
  /**
   * @param {import("./protocol-types").EngineRequest} request
   * @returns {Promise<import("./protocol-types").EngineResponse>}
   */
  async process(request) {
    const clientEvent = request && request.clientEvent ? request.clientEvent : {};
    const latex = typeof clientEvent.latex === "string" ? clientEvent.latex : "";
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
 * and EngineResponses (using embedded StubEngine in this demo).
 */
export class EngineAdapter {
  /**
   * @param {FileBus} bus
   * @param {EngineAdapterConfig} config
   */
  constructor(bus, config) {
    this.bus = bus;
    this.config = config || { mode: "embedded" };
    this.stubEngine = this.config.mode === "embedded" ? new StubEngine() : null;
    this.unsubscribe = null;

    // Bind handler once
    this.handleBusMessage = this.handleBusMessage.bind(this);
  }

  start() {
    if (this.unsubscribe) return;
    this.unsubscribe = this.bus.subscribe(this.handleBusMessage);
    console.log(`[EngineAdapter] Started in ${this.config.mode} mode`);
  }

  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * @param {import("./protocol-types").BusMessage} message
   */
  async handleBusMessage(message) {
    // Only process ClientEvents from display
    if (!message || message.messageType !== "ClientEvent") return;

    const clientEvent = message.payload;
    const engineRequest = this.toEngineRequest(clientEvent);

    // Filter: only send operator-like events (and hovers) to the engine.
    if (!this.shouldSendToEngine(clientEvent, engineRequest.type)) {
      return;
    }

    // 1) Publish the EngineRequest to the bus (for recording)
    this.bus.publishEngineRequest(engineRequest);

    // 2) Process via StubEngine / HTTP engine
    try {
      const response = await this.processRequest(engineRequest);
      this.bus.publishEngineResponse(response);
    } catch (err) {
      const errorResponse = {
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


  /**
   * Decide whether a given ClientEvent should be sent to the engine.
   * We keep hover-based getHints, but ignore clicks on non-operator nodes.
   * @param {any} clientEvent
   * @param {"parse"|"previewStep"|"applyStep"|"getHints"} requestType
   */
  shouldSendToEngine(clientEvent, requestType) {
    if (!clientEvent) return false;

    const t = clientEvent.type;

    // Always allow hover-based hints.
    if (t === "hover") {
      return true;
    }

    // Do not send pure selection / drag events to the engine for now.
    if (t === "selectionChanged" || t === "dragSelect") {
      return false;
    }

    // For click / dblclick we only allow operator-like nodes.
    if (t === "click" || t === "dblclick") {
      const role = clientEvent.surfaceNodeRole || "";
      const kind = clientEvent.surfaceNodeKind || "";
      const nodeId = clientEvent.surfaceNodeId;

      // Binary/relational/fraction operators.
      const isOperatorRole = role === "operator";
      const isOperatorKind =
        kind === "BinaryOp" ||
        kind === "MinusUnary" ||
        kind === "MinusBinary" ||
        kind === "Relation" ||
        kind === "Fraction";

      // Must be a real surface node inside the formula.
      if (!nodeId) return false;

      return isOperatorRole || isOperatorKind;
    }

    // Everything else (parse, unknown types) we ignore.
    return false;
  }


  /**
     * Map ClientEvent → EngineRequest.type (getHints / previewStep / applyStep / parse).
     * @param {any} clientEvent
     * @returns {{ type: "parse" | "previewStep" | "applyStep" | "getHints"; clientEvent: any }}
     */
  toEngineRequest(clientEvent) {
    let requestType = "parse";

    switch (clientEvent && clientEvent.type) {
      case "click":
        // single click on operator → applyStep
        // double-click → applyStep
        // others → previewStep
        {
          const isDouble = clientEvent.click && clientEvent.click.clickCount === 2;
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

          if (isDouble || isOperator) {
            requestType = "applyStep";
          } else {
            requestType = "previewStep";
          }
        }
        break;
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

    return {
      type: requestType,
      clientEvent,
    };
  }

  /**
   * @param {{ type: string; clientEvent: any }} request
   * @returns {Promise<any>}
   */
  async processRequest(request) {
    if (this.config.mode === "embedded") {
      return this.stubEngine.process(request);
    }

    // HTTP mode
    const endpoint = this.config.httpEndpoint;
    if (!endpoint) {
      throw new Error("HTTP mode requires httpEndpoint in config");
    }

    // Only handle applyStep for now via the new Engine
    if (request.type !== "applyStep") {
      // Return a dummy OK response for non-apply steps to keep the UI happy
      return {
        type: "ok",
        requestType: request.type,
        result: {
          latex: request.clientEvent.latex,
          meta: { status: "ignored-by-new-engine" }
        }
      };
    }

    const timeout = this.config.httpTimeout || 5000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Map to EntryStepRequest
      const entryStepRequest = {
        sessionId: "default-session",
        expressionLatex: request.clientEvent.latex,
        selectionPath: null, // Not used for simple operator clicks
        operatorIndex: request.clientEvent.surfaceOperatorIndex,
        policyId: "student.basic"
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(entryStepRequest),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const engineStepResponse = await response.json();

      // Map back to EngineResponse
      return {
        type: "ok",
        requestType: request.type,
        result: {
          latex: engineStepResponse.expressionLatex,
          meta: {
            backendStatus: engineStepResponse.status,
            debugInfo: engineStepResponse.debugInfo
          }
        }
      };

    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }
}
