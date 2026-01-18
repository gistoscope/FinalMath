/**
 * TraceHub - Viewer-side tracing infrastructure
 *
 * This file re-exports from the refactored trace-hub module.
 * For new code, import directly from './trace-hub/index.js'
 *
 * @deprecated Import from './trace-hub/index.js' instead
 */

export {
  RingBuffer,
  TraceEvent,
  TraceExporter,
  traceHub,
  TraceIdGenerator,
  TraceSummaryBuilder,
  ViewerTraceHub,
} from "./trace-hub/index.js";
