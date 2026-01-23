/**
 * ViewerTraceHub - Main trace hub class
 *
 * Coordinates trace ID generation, event storage, and export functionality.
 * In-memory ring buffer for end-to-end debugging, correlated with backend via traceId.
 */

import { RingBuffer } from "./RingBuffer.js";
import { TraceEvent } from "./TraceEvent.js";
import { TraceExporter } from "./TraceExporter.js";
import { TraceIdGenerator } from "./TraceIdGenerator.js";
import { TraceSummaryBuilder } from "./TraceSummaryBuilder.js";

class ViewerTraceHub {
  /**
   * Create a new ViewerTraceHub instance
   * @param {number} [maxSize=50000] - Maximum number of events to store
   */
  constructor(maxSize = 50000) {
    this.idGenerator = new TraceIdGenerator();
    this.buffer = new RingBuffer(maxSize);
  }

  /**
   * Generate a new trace ID for an apply attempt
   * @returns {string} The generated trace ID
   */
  generateTraceId() {
    return this.idGenerator.generate();
  }

  /**
   * Get current trace ID
   * @returns {string|null} The current trace ID
   */
  getTraceId() {
    return this.idGenerator.getCurrent();
  }

  /**
   * Emit a trace event
   * @param {Object} params - Event parameters
   * @param {string} [params.traceId] - Trace ID (uses current if not provided)
   * @param {string} [params.stepId] - Step ID
   * @param {string} [params.module] - Module name
   * @param {string} [params.level] - Log level
   * @param {string} params.event - Event name
   * @param {Object} [params.data] - Additional data
   */
  emit(params) {
    const event = TraceEvent.create({
      ...params,
      traceId: params.traceId || this.idGenerator.getCurrent() || "unknown",
    });

    this.buffer.push(event);

    // Console log for development
    if (TraceEvent.shouldLog(event)) {
      console.log(TraceEvent.formatForConsole(event));
    }
  }

  /**
   * Get the last N events
   * @param {number} n - Number of events to retrieve
   * @returns {Array} The last N events
   */
  getLastN(n) {
    return this.buffer.getLastN(n);
  }

  /**
   * Get all events for the current/last traceId
   * @returns {Array} Events matching current trace ID
   */
  getByCurrentTrace() {
    const currentTraceId = this.idGenerator.getCurrent();
    if (!currentTraceId) return [];
    return this.buffer.filter((e) => e.traceId === currentTraceId);
  }

  /**
   * Get all events
   * @returns {Array} All stored events
   */
  dump() {
    return this.buffer.getAll();
  }

  /**
   * Get event count
   * @returns {number} Number of stored events
   */
  count() {
    return this.buffer.count();
  }

  /**
   * Clear all events and reset trace ID
   */
  clear() {
    this.buffer.clear();
    this.idGenerator.clear();
    console.log("[TraceHub] Buffer cleared");
  }

  /**
   * Export as JSONL string
   * @returns {string} JSONL formatted events
   */
  toJsonl() {
    return TraceExporter.toJsonl(this.buffer.getAll());
  }

  /**
   * Download trace as JSONL file
   */
  downloadJsonl() {
    TraceExporter.downloadJsonl(this.buffer.getAll());
  }

  /**
   * Get last trace summary for UI overlay
   * @returns {Object|null} Summary object or null if no events
   */
  getLastTraceSummary() {
    const currentTraceId = this.idGenerator.getCurrent();
    const events = this.getByCurrentTrace();
    return TraceSummaryBuilder.build(currentTraceId, events);
  }
}

export { ViewerTraceHub };
