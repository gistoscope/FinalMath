/* eslint-disable @typescript-eslint/no-explicit-any */
import { singleton } from "tsyringe";

export interface TraceEvent {
  id: string;
  timestamp: number;
  type: string;
  payload: any;
  traceId: string;
}

/**
 * TraceRecorder - Centralized event recording for diagnostics.
 */
@singleton()
export class TraceRecorder {
  private events: TraceEvent[] = [];
  private currentTraceId: string = "initial";

  public setTraceId(id: string) {
    this.currentTraceId = id;
  }

  public record(type: string, payload: any) {
    const event: TraceEvent = {
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      type,
      payload,
      traceId: this.currentTraceId,
    };
    this.events.push(event);

    // Logic for truncation if buffer too large
    if (this.events.length > 1000) {
      this.events.shift();
    }
  }

  public getEvents(): TraceEvent[] {
    return [...this.events];
  }

  public clear() {
    this.events = [];
  }

  public exportJson(): string {
    return JSON.stringify(this.events, null, 2);
  }
}
