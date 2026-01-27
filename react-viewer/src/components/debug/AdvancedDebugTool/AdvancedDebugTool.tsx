import React, { useEffect, useState } from "react";
import type { DebuggerState } from "../../../app/core/Debugger";
import { Debugger } from "../../../app/core/Debugger";
import { useViewerStore } from "../../../store/useViewerStore";
import "./AdvancedDebugTool.css";
import AstTreeView from "./AstTreeView";
import JsonView from "./JsonView";
import MapMasterPanel from "./MapMasterPanel";
import StepMasterPanel from "./StepMasterPanel";
import TraceHubView from "./TraceHubView";

type TabType = "ast" | "map" | "step" | "json" | "trace";

const AdvancedDebugTool: React.FC = () => {
  const latex = useViewerStore((state) => state.formula.latex);
  const [debugState, setDebugState] = useState<DebuggerState | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("ast");

  useEffect(() => {
    const unsubscribe = Debugger.subscribe((s) => setDebugState({ ...s }));
    return unsubscribe;
  }, []);

  const handleAstDebug = () => {
    Debugger.fetchAstDebug(latex);
  };

  const handleMapDebug = () => {
    // Basic operator index 0 for now as demo
    Debugger.fetchMapDebug({
      latex: latex,
      selection: { operatorIndex: 0 },
      mode: "structural",
    });
  };

  return (
    <div className="advanced-debug-tool">
      <div className="debug-tabs">
        <div
          className={`debug-tab ${activeTab === "ast" ? "active" : ""}`}
          onClick={() => setActiveTab("ast")}
        >
          AST
        </div>
        <div
          className={`debug-tab ${activeTab === "map" ? "active" : ""}`}
          onClick={() => setActiveTab("map")}
        >
          MapMaster
        </div>
        <div
          className={`debug-tab ${activeTab === "step" ? "active" : ""}`}
          onClick={() => setActiveTab("step")}
        >
          StepMaster
        </div>
        <div
          className={`debug-tab ${activeTab === "trace" ? "active" : ""}`}
          onClick={() => setActiveTab("trace")}
        >
          TraceHub
        </div>
        <div
          className={`debug-tab ${activeTab === "json" ? "active" : ""}`}
          onClick={() => setActiveTab("json")}
        >
          Raw JSON
        </div>
      </div>

      <div className="debug-content">
        <div className="debug-controls">
          <button className="primary" onClick={handleAstDebug}>
            Refresh AST
          </button>
          <button className="secondary" onClick={handleMapDebug}>
            Debug Map (Op 0)
          </button>
          {debugState?.loading && (
            <span style={{ marginLeft: "12px", color: "#64748b" }}>
              Loading...
            </span>
          )}
        </div>

        {debugState?.error && (
          <div style={{ color: "red", marginBottom: "16px" }}>
            {debugState.error}
          </div>
        )}

        {activeTab === "ast" && (
          <div className="ast-tab">
            {debugState?.currentAst ? (
              <AstTreeView node={debugState.currentAst} />
            ) : (
              <div>No AST loaded. Click Refresh.</div>
            )}
          </div>
        )}

        {activeTab === "map" && (
          <MapMasterPanel result={debugState?.currentMapResult} />
        )}

        {activeTab === "step" && (
          <StepMasterPanel result={debugState?.currentStepResult} />
        )}

        {activeTab === "trace" && <TraceHubView />}

        {activeTab === "json" && <JsonView data={debugState} />}
      </div>
    </div>
  );
};

export default AdvancedDebugTool;
