import React from "react";
import { useViewer } from "../../context/ViewerContext";

const JsonInspector: React.FC = () => {
  const { state } = useViewer();
  const { surfaceMapJson } = state.system;

  return (
    <pre
      id="surface-json"
      style={{
        marginTop: "12px",
        padding: "12px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        fontSize: "12px",
        overflowX: "auto",
        maxHeight: "400px",
      }}
    >
      {surfaceMapJson
        ? JSON.stringify(surfaceMapJson, null, 2)
        : JSON.stringify({ status: "building surface map..." }, null, 2)}
    </pre>
  );
};

export default JsonInspector;
