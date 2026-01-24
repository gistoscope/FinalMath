// core/FileBus.ts
// Browser-only FileBus implementation compatible with Claude's BusMessage schema.

export type BusDirection = "clientToEngine" | "engineToClient";
export type BusMessageType = "ClientEvent" | "EngineRequest" | "EngineResponse";

export interface BusMessage {
  direction: BusDirection;
  timestamp: number;
  payload: any; // ClientEvent | EngineRequest | EngineResponse
  messageType: BusMessageType;
}

export type BusSubscriber = (msg: BusMessage) => void | Promise<void>;

export class FileBus {
  public name: string;
  public maxHistory: number;
  private history: BusMessage[] = [];
  private subscribers: Set<BusSubscriber> = new Set();

  constructor(config: { name?: string; maxHistory?: number } = {}) {
    this.name = config.name || "browser-bus";
    this.maxHistory =
      typeof config.maxHistory === "number" ? config.maxHistory : 1000;
  }

  subscribe(subscriber: BusSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  _publish(message: BusMessage) {
    this.history.push(message);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    for (const subscriber of this.subscribers) {
      try {
        const result = subscriber(message);
        if (result && typeof result.then === "function") {
          result.catch((err: any) => {
            console.error("[FileBus] Async subscriber error:", err);
          });
        }
      } catch (err) {
        console.error("[FileBus] Subscriber error:", err);
      }
    }
  }

  publishClientEvent(event: any) {
    const message: BusMessage = {
      direction: "clientToEngine",
      timestamp: Date.now(),
      payload: event,
      messageType: "ClientEvent",
    };
    this._publish(message);
  }

  publishEngineRequest(request: any) {
    const message: BusMessage = {
      direction: "clientToEngine",
      timestamp: Date.now(),
      payload: request,
      messageType: "EngineRequest",
    };
    this._publish(message);
  }

  publishEngineResponse(response: any) {
    const message: BusMessage = {
      direction: "engineToClient",
      timestamp: Date.now(),
      payload: response,
      messageType: "EngineResponse",
    };
    this._publish(message);
  }

  getHistory(): BusMessage[] {
    return [...this.history];
  }

  clearHistory() {
    this.history = [];
  }

  clear() {
    this.history = [];
    this.subscribers.clear();
  }
}
