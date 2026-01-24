import React from "react";
import { useViewer } from "../../context/ViewerContext";

const EngineDebugPanel: React.FC = () => {
  const { state } = useViewer();
  const { engine } = state.debug;

  return (
    <div id="engine-debug-panel" className="hover-panel">
      <div className="hover-title">Engine debug (FileBus)</div>
      <div className="hover-line">
        <span className="label">ClientEvent:</span>
        <span id="engine-debug-client">{engine.clientEvent || "—"}</span>
      </div>
      <div className="hover-line">
        <span className="label">EngineRequest:</span>
        <span id="engine-debug-request">{engine.request || "—"}</span>
      </div>
      <div className="hover-line">
        <span className="label">EngineResponse:</span>
        <span id="engine-debug-response">{engine.response || "—"}</span>
      </div>
    </div>
  );
};

export default EngineDebugPanel;
