// features/trace-hub/TraceExporter.ts
import { TraceEventData } from "./TraceEvent";

class TraceExporter {
  static toJsonl(events: TraceEventData[]): string {
    return events.map((e) => JSON.stringify(e)).join("\n");
  }

  static generateFilename(prefix = "viewer-trace"): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `${prefix}-${timestamp}.jsonl`;
  }

  static downloadJsonl(events: TraceEventData[], filenamePrefix?: string) {
    const jsonl = TraceExporter.toJsonl(events);
    const blob = new Blob([jsonl], { type: "application/x-ndjson" });
    const url = URL.createObjectURL(blob);
    const filename = TraceExporter.generateFilename(filenamePrefix);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`[TraceHub] Downloaded ${events.length} events to ${filename}`);
  }
}

export { TraceExporter };
