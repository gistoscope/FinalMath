// features/trace-hub/TraceEvent.ts
export interface TraceEventData {
  ts: string;
  traceId: string;
  stepId: string | null;
  module: string;
  level: string;
  event: string;
  data: unknown;
}

export interface TraceEventParams {
  traceId?: string;
  stepId?: string;
  module?: string;
  level?: string;
  event: string;
  data?: unknown;
}

class TraceEvent {
  static create(params: TraceEventParams): TraceEventData {
    return {
      ts: new Date().toISOString(),
      traceId: params.traceId || "unknown",
      stepId: params.stepId || null,
      module: params.module || "viewer",
      level: params.level || "INFO",
      event: params.event,
      data: params.data || {},
    };
  }

  static shouldLog(event: TraceEventData): boolean {
    return event.level === "INFO" || event.level === "DEBUG";
  }

  static formatForConsole(event: TraceEventData): string {
    const shortTraceId = event.traceId.substring(0, 8);
    return `[TraceHub] ${event.module}:${event.event} traceId=${shortTraceId}`;
  }
}

export { TraceEvent };
