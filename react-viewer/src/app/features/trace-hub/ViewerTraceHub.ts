// features/trace-hub/ViewerTraceHub.ts
import { RingBuffer } from "./RingBuffer";
import type { TraceEventData, TraceEventParams } from "./TraceEvent";
import { TraceEvent } from "./TraceEvent";
import { TraceExporter } from "./TraceExporter";
import { TraceIdGenerator } from "./TraceIdGenerator";
import type { TraceSummary } from "./TraceSummaryBuilder";
import { TraceSummaryBuilder } from "./TraceSummaryBuilder";

class ViewerTraceHub {
  private idGenerator: TraceIdGenerator;
  private buffer: RingBuffer<TraceEventData>;

  constructor(maxSize: number = 50000) {
    this.idGenerator = new TraceIdGenerator();
    this.buffer = new RingBuffer<TraceEventData>(maxSize);
  }

  generateTraceId(): string {
    return this.idGenerator.generate();
  }

  getTraceId(): string | null {
    return this.idGenerator.getCurrent();
  }

  emit(params: TraceEventParams) {
    const event = TraceEvent.create({
      ...params,
      traceId: params.traceId || this.idGenerator.getCurrent() || "unknown",
    });

    this.buffer.push(event);

    if (TraceEvent.shouldLog(event)) {
      console.log(TraceEvent.formatForConsole(event));
    }
  }

  getLastN(n: number): TraceEventData[] {
    return this.buffer.getLastN(n);
  }

  getByCurrentTrace(): TraceEventData[] {
    const currentTraceId = this.idGenerator.getCurrent();
    if (!currentTraceId) return [];
    return this.buffer.filter((e) => e.traceId === currentTraceId);
  }

  dump(): TraceEventData[] {
    return this.buffer.getAll();
  }

  count(): number {
    return this.buffer.count();
  }

  clear() {
    this.buffer.clear();
    this.idGenerator.clear();
    console.log("[TraceHub] Buffer cleared");
  }

  toJsonl(): string {
    return TraceExporter.toJsonl(this.buffer.getAll());
  }

  downloadJsonl() {
    TraceExporter.downloadJsonl(this.buffer.getAll());
  }

  getLastTraceSummary(): TraceSummary | null {
    const currentTraceId = this.idGenerator.getCurrent();
    const events = this.getByCurrentTrace();
    return TraceSummaryBuilder.build(currentTraceId, events);
  }
}

export { ViewerTraceHub };
