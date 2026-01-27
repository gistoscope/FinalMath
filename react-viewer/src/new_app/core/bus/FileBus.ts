/* eslint-disable @typescript-eslint/no-explicit-any */

import { singleton } from "tsyringe";
import type {
  BusMessage,
  BusSubscriber,
  IFileBus,
} from "../interfaces/IFileBus";

@singleton()
export class FileBus implements IFileBus {
  public name: string = "browser-bus";
  public maxHistory: number = 1000;
  private history: BusMessage[] = [];
  private subscribers: Set<BusSubscriber> = new Set();

  constructor() {}

  subscribe(subscriber: BusSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  private _publish(message: BusMessage) {
    this.history.push(message);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    for (const subscriber of this.subscribers) {
      try {
        const result = subscriber(message);
        if (result && typeof (result as any).then === "function") {
          (result as any).catch((err: any) => {
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
