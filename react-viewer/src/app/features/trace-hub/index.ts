import { RingBuffer } from "./RingBuffer";
import type { TraceEventData, TraceEventParams } from "./TraceEvent";
import { TraceExporter } from "./TraceExporter";
import { TraceIdGenerator } from "./TraceIdGenerator";
import { TraceSummaryBuilder, type TraceSummary } from "./TraceSummaryBuilder";
import { ViewerTraceHub } from "./ViewerTraceHub";

const traceHub = new ViewerTraceHub();

/**
 * Global interface for traceHub
 */
export interface TraceHubGlobal {
  emit: (params: TraceEventParams) => void;
  dump: () => TraceEventData[];
  clear: () => void;
  downloadJsonl: () => void;
  getLastN: (n: number) => TraceEventData[];
  getLastTraceSummary: () => TraceSummary | null;
  count: () => number;
}

if (typeof window !== "undefined") {
  (window as any).__traceHub = {
    emit: (params: TraceEventParams) => traceHub.emit(params),
    dump: () => traceHub.dump(),
    clear: () => traceHub.clear(),
    downloadJsonl: () => traceHub.downloadJsonl(),
    getLastN: (n: number) => traceHub.getLastN(n),
    getLastTraceSummary: () => traceHub.getLastTraceSummary(),
    count: () => traceHub.count(),
  };
}

export {
  RingBuffer,
  TraceExporter,
  traceHub,
  TraceIdGenerator,
  TraceSummaryBuilder,
  ViewerTraceHub,
};
