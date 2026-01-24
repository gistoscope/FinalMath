import React, { useEffect, useState } from "react";
import { traceHub } from "../../../app/features/trace-hub";

const TraceHubView: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);

  const refresh = () => {
    setEvents(traceHub.dump().reverse());
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="tracehub-view">
      <div className="debug-controls">
        <button
          className="secondary"
          onClick={() => {
            traceHub.clear();
            refresh();
          }}
        >
          Clear
        </button>
        <button className="secondary" onClick={() => traceHub.downloadJsonl()}>
          Download JSONL
        </button>
        <span style={{ fontSize: "12px", color: "#64748b" }}>
          {events.length} events
        </span>
      </div>
      <div style={{ display: "grid", gap: "4px" }}>
        {events.length === 0 && (
          <div style={{ color: "#64748b", textAlign: "center" }}>
            No trace events.
          </div>
        )}
        {events.map((ev, i) => {
          const shortTraceId = ev.traceId ? ev.traceId.substring(0, 8) : "???";
          return (
            <div
              key={i}
              style={{
                padding: "4px 8px",
                background: "#f1f5f9",
                borderRadius: "4px",
                fontSize: "12px",
              }}
            >
              <span style={{ color: "#0369a1", fontWeight: "bold" }}>
                {shortTraceId}
              </span>
              <span style={{ color: "#6366f1", margin: "0 4px" }}>
                {ev.module}
              </span>
              :
              <span style={{ color: "#059669", margin: "0 4px" }}>
                {ev.event}
              </span>
              <span style={{ color: "#94a3b8", float: "right" }}>
                {new Date(ev.timestamp).toLocaleTimeString()}
              </span>
              {ev.data && (
                <details style={{ marginTop: "4px" }}>
                  <summary style={{ cursor: "pointer", color: "#64748b" }}>
                    Data
                  </summary>
                  <pre
                    style={{
                      fontSize: "10px",
                      color: "#475569",
                      overflow: "auto",
                    }}
                  >
                    {JSON.stringify(ev.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TraceHubView;
