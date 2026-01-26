/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * IFileBus.ts
 * Interface for the internal message bus.
 */

export type BusDirection = "clientToEngine" | "engineToClient";
export type BusMessageType = "ClientEvent" | "EngineRequest" | "EngineResponse";

export interface BusMessage {
  direction: BusDirection;
  timestamp: number;
  payload: any;
  messageType: BusMessageType;
}

export type BusSubscriber = (msg: BusMessage) => void | Promise<void>;

export interface IFileBus {
  name: string;
  subscribe(subscriber: BusSubscriber): () => void;
  publishClientEvent(event: any): void;
  publishEngineRequest(request: any): void;
  publishEngineResponse(response: any): void;
  getHistory(): BusMessage[];
  clearHistory(): void;
  clear(): void;
}
