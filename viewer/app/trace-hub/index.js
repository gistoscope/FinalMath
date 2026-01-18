/**
 * TraceHub - Viewer-side tracing infrastructure
 *
 * In-memory ring buffer for end-to-end debugging.
 * Correlated with backend via traceId.
 *
 * @module trace-hub
 */

import { RingBuffer } from "./RingBuffer.js";
import { TraceEvent } from "./TraceEvent.js";
import { TraceExporter } from "./TraceExporter.js";
import { TraceIdGenerator } from "./TraceIdGenerator.js";
import { TraceSummaryBuilder } from "./TraceSummaryBuilder.js";
import { ViewerTraceHub } from "./ViewerTraceHub.js";

// ============================================================
// SINGLETON & GLOBAL EXPOSURE
// ============================================================

const traceHub = new ViewerTraceHub();

// Expose globally for debugging
if (typeof window !== "undefined") {
  window.__traceHub = {
    emit: (params) => traceHub.emit(params),
    dump: () => traceHub.dump(),
    clear: () => traceHub.clear(),
    downloadJsonl: () => traceHub.downloadJsonl(),
    getLastN: (n) => traceHub.getLastN(n),
    getLastTraceSummary: () => traceHub.getLastTraceSummary(),
    count: () => traceHub.count(),
  };
}

// Main exports
export { traceHub, ViewerTraceHub };

// Component exports for advanced usage
export {
  RingBuffer,
  TraceEvent,
  TraceExporter,
  TraceIdGenerator,
  TraceSummaryBuilder,
};
