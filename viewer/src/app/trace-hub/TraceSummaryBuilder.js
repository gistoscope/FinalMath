/**
 * TraceSummaryBuilder - Builds summary objects from trace events
 *
 * Extracts key information from trace events for UI display.
 */

class TraceSummaryBuilder {
  /**
   * Build a summary from a list of trace events
   * @param {string} traceId - The trace ID
   * @param {Array} events - List of trace events
   * @returns {Object|null} Summary object or null if no events
   */
  static build(traceId, events) {
    if (!events || events.length === 0) {
      return null;
    }

    const summary = {
      traceId,
      eventCount: events.length,
      events: events.slice(-10), // Last 10 events for quick view
      timing: {
        start: events[0]?.ts,
        end: events[events.length - 1]?.ts,
      },
    };

    // Extract key info from events
    TraceSummaryBuilder._extractKeyInfo(summary, events);

    return summary;
  }

  /**
   * Extract key information from events into the summary
   * @private
   * @param {Object} summary - The summary object to populate
   * @param {Array} events - The events to extract from
   */
  static _extractKeyInfo(summary, events) {
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
