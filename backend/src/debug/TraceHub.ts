/**
 * TraceHub Class
 *
 * Centralized tracing infrastructure for debugging and observability.
 *
 * Responsibilities:
 *  - Emit and collect trace events
 *  - Context management for trace correlation
 *  - Event filtering and formatting
 */

export interface TraceEvent {
  module: string;
  event: string;
  data?: Record<string, unknown>;
  timestamp?: number;
  traceId?: string;
  stepId?: string;
}

export interface TraceContext {
  traceId: string;
  stepId: string;
}

/**
 * TraceHub - Centralized tracing
 */
export class TraceHub {
  private static currentContext: TraceContext | null = null;
  private static events: TraceEvent[] = [];
  private static maxEvents = 1000;
  private static enabled = true;

  /**
   * Set the current trace context.
   */
  static setContext(traceId: string, stepId: string): void {
    this.currentContext = { traceId, stepId };
  }

  /**
   * Clear the current context.
   */
  static clearContext(): void {
    this.currentContext = null;
  }

  /**
   * Emit a trace event.
   */
  static emit(event: Omit<TraceEvent, "timestamp" | "traceId" | "stepId">): void {
    if (!this.enabled) {
      return;
    }

    const fullEvent: TraceEvent = {
      ...event,
      timestamp: Date.now(),
      traceId: this.currentContext?.traceId,
      stepId: this.currentContext?.stepId,
    };

    this.events.push(fullEvent);

    // Limit event storage
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Optional: Log to console for development
    if (process.env.TRACE_DEBUG === "true") {
      console.log(`[Trace] ${event.module}::${event.event}`, event.data);
    }
  }

  /**
   * Get all events for a trace.
   */
  static getEventsForTrace(traceId: string): TraceEvent[] {
    return this.events.filter((e) => e.traceId === traceId);
  }

  /**
   * Get recent events.
   */
  static getRecentEvents(count = 100): TraceEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Clear all events.
   */
  static clear(): void {
    this.events = [];
  }

  /**
   * Enable or disable tracing.
   */
  static setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get the current context.
   */
  static getContext(): TraceContext | null {
    return this.currentContext;
  }
}

/**
 * Generate a unique trace ID.
 */
export function generateTraceId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Shorten LaTeX for logging.
 */
export function shortLatex(latex: string, maxLen = 30): string {
  if (latex.length <= maxLen) {
    return latex;
  }
  return latex.slice(0, maxLen - 3) + "...";
}
