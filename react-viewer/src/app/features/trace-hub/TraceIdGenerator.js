/**
 * TraceIdGenerator - Generates unique trace IDs for correlating events
 */

class TraceIdGenerator {
  constructor() {
    this.currentTraceId = null;
  }

  /**
   * Generate a new trace ID for an apply attempt
   * Format: tr-{timestamp_base36}-{random_6chars}
   * @returns {string} The generated trace ID
   */
  generate() {
    this.currentTraceId = `tr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
    return this.currentTraceId;
  }

  /**
   * Get current trace ID
   * @returns {string|null} The current trace ID or null if not generated
   */
  getCurrent() {
    return this.currentTraceId;
  }

  /**
   * Clear the current trace ID
   */
  clear() {
    this.currentTraceId = null;
  }
}

export { TraceIdGenerator };
