import React from "react";
import { useViewer } from "../../context/ViewerContext";

const TSADebugPanel: React.FC = () => {
  const { state } = useViewer();
  const { tsa } = state.debug;

  return (
    <div id="tsa-debug-panel" className="hover-panel">
      <div className="hover-title">TSA debug</div>
      <div className="hover-line">
        <span className="label">Operator:</span>
        <span id="tsa-debug-operator">{tsa.operator || "—"}</span>
      </div>
      <div className="hover-line">
        <span className="label">Strategy:</span>
        <span id="tsa-debug-strategy">{tsa.strategy || "—"}</span>
      </div>
      <div className="hover-line">
        <span className="label">Invariant:</span>
        <span id="tsa-debug-invariant">{tsa.invariant || "—"}</span>
      </div>
      <div className="hover-line">
        <span className="label">Invariant text:</span>
        <span id="tsa-debug-invariant-text">{tsa.invariantText || "—"}</span>
      </div>
      <div className="hover-line">
        <span className="label">Window before:</span>
        <span id="tsa-debug-before">{tsa.windowBefore || "—"}</span>
      </div>
      <div className="hover-line">
        <span className="label">Window after:</span>
        <span id="tsa-debug-after">{tsa.windowAfter || "—"}</span>
      </div>
      <div className="hover-line">
        <span className="label">Error:</span>
        <span id="tsa-debug-error">{tsa.error || "—"}</span>
      </div>
      <div className="hover-line">
        <span className="label">AST nodes:</span>
        <span id="tsa-debug-ast-size">{tsa.astSize || "—"}</span>
      </div>
    </div>
  );
};

export default TSADebugPanel;
