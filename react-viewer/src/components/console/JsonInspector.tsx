import React from "react";
import { useViewerStore } from "../../store/useViewerStore";

const JsonInspector: React.FC = () => {
  const surfaceMapJson = useViewerStore((state) => state.system.surfaceMapJson);

  return (
    <pre
      id="surface-json"
      style={{
        marginTop: "12px",
        padding: "12px",
        borderRadius: "8px",
        overflowX: "auto",
        maxHeight: "400px",
        textAlign: "left",
      }}
    >
      {surfaceMapJson
        ? JSON.stringify(surfaceMapJson, null, 2)
        : JSON.stringify({ status: "building surface map..." }, null, 2)}
    </pre>
  );
};

export default JsonInspector;
