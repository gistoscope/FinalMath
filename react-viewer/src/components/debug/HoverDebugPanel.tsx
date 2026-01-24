import React from "react";
import { useViewer } from "../../context/ViewerContext";

const HoverDebugPanel: React.FC = () => {
  const { state } = useViewer();
  const { hover } = state.debug;

  return (
    <div id="hover-panel" className="hover-panel">
      <div className="hover-title">Hover / Click debug</div>
      <div className="hover-line">
        <span className="label">Hover:</span>{" "}
        <span id="hover-info">{hover.target || "—"}</span>
      </div>
      <div className="hover-line">
        <span className="label">Last click:</span>
        <span id="click-info">{hover.lastClick || "—"}</span>
      </div>
    </div>
  );
};

export default HoverDebugPanel;
