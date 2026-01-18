/**
 * TraceEvent - Factory for creating structured trace events
 */

class TraceEvent {
  /**
   * Create a new trace event
   * @param {Object} params - Event parameters
   * @param {string} [params.traceId] - Trace ID for correlation
   * @param {string} [params.stepId] - Step ID within the trace
   * @param {string} [params.module] - Module name (default: "viewer")
   * @param {string} [params.level] - Log level (default: "INFO")
   * @param {string} params.event - Event name
   * @param {Object} [params.data] - Additional event data
   * @returns {Object} The structured trace event
   */
  static create(params) {
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

  /**
   * Check if an event should be logged to console
   * @param {Object} event - The trace event
   * @returns {boolean} True if the event should be logged
   */
  static shouldLog(event) {
    return event.level === "INFO" || event.level === "DEBUG";
  }

  /**
   * Format event for console logging
   * @param {Object} event - The trace event
   * @returns {string} Formatted log string
   */
  static formatForConsole(event) {
    const shortTraceId = event.traceId.substring(0, 8);
    return `[TraceHub] ${event.module}:${event.event} traceId=${shortTraceId}`;
  }
}

export { TraceEvent };
