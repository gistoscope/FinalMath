/**
 * TraceExporter - Handles exporting trace events to various formats
 */

class TraceExporter {
  /**
   * Convert events to JSONL (JSON Lines) format
   * @param {Array} events - List of trace events
   * @returns {string} JSONL string
   */
  static toJsonl(events) {
    return events.map((e) => JSON.stringify(e)).join("\n");
  }

  /**
   * Generate a timestamped filename for trace export
   * @param {string} [prefix="viewer-trace"] - Filename prefix
   * @returns {string} Generated filename
   */
  static generateFilename(prefix = "viewer-trace") {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `${prefix}-${timestamp}.jsonl`;
  }

  /**
   * Download events as a JSONL file in the browser
   * @param {Array} events - List of trace events
   * @param {string} [filenamePrefix] - Optional filename prefix
   */
  static downloadJsonl(events, filenamePrefix) {
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
