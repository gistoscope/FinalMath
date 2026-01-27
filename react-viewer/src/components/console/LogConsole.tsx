import React, { useEffect, useRef } from "react";
import { useViewerStore } from "../../store/useViewerStore";

const LogConsole: React.FC = () => {
  const logs = useViewerStore((state) => state.system.logs);
  const scrollRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const content = Array.isArray(logs) ? logs.join("\n") : logs;

  return (
    <pre
      id="tsa-log-output"
      ref={scrollRef}
      style={{
        marginTop: "8px",
        padding: "10px 12px",
        maxHeight: "360px",
        overflow: "auto",
        whiteSpace: "pre",
        background: "#0f172a",
        color: "#e5e7eb",
        borderRadius: "8px",
        fontSize: "14px",
      }}
    >
      {content || "—"}
    </pre>
  );
};

export default LogConsole;
