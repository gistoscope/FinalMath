// features/trace-hub/TraceSummaryBuilder.ts
import { TraceEventData } from "./TraceEvent";

export interface TraceSummary {
  traceId: string | null;
  eventCount: number;
  events: TraceEventData[];
  timing: {
    start: string;
    end: string;
  };
  lastRequest?: any;
  lastResponse?: any;
  chosenPrimitiveId?: string;
  outputLatex?: string;
}

class TraceSummaryBuilder {
  static build(
    traceId: string | null,
    events: TraceEventData[],
  ): TraceSummary | null {
    if (!events || events.length === 0) {
      return null;
    }

    const summary: TraceSummary = {
      traceId,
      eventCount: events.length,
      events: events.slice(-10),
      timing: {
        start: events[0]?.ts || "",
        end: events[events.length - 1]?.ts || "",
      },
    };

    TraceSummaryBuilder._extractKeyInfo(summary, events);

    return summary;
  }

  private static _extractKeyInfo(
    summary: TraceSummary,
    events: TraceEventData[],
  ) {
    for (const ev of events) {
      if (ev.event === "STEP_REQUEST") {
        summary.lastRequest = ev.data;
      }
      if (ev.event === "STEP_RESPONSE") {
        summary.lastResponse = ev.data;
      }
      if (ev.data?.chosenPrimitiveId) {
        summary.chosenPrimitiveId = ev.data.chosenPrimitiveId;
      }
      if (ev.data?.outputLatex) {
        summary.outputLatex = ev.data.outputLatex;
      }
    }
  }
}

export { TraceSummaryBuilder };
