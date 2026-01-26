import React from "react";
import { useViewerStore } from "../../store/useViewerStore";

const DiagnosticsPanel: React.FC = () => {
  const p1 = useViewerStore((state) => state.p1Diagnostics);

  const astColor = p1.resolvedAstNodeId === "MISSING" ? "#f87171" : "#4ade80";
  const testResultColor =
    p1.lastTestResult === "PASS"
      ? "#4ade80"
      : p1.lastTestResult === "N/A"
        ? "#fff"
        : "#f87171";
  const choiceStatusColor =
    p1.lastChoiceStatus === "choice" ? "#4ade80" : "#fff";
  const applyStatusColor =
    p1.lastHintApplyStatus === "step-applied"
      ? "#4ade80"
      : p1.lastHintApplyStatus === "RUNNING"
        ? "#fbbf24"
        : p1.lastHintApplyStatus === "N/A"
          ? "#fff"
          : "#f87171";

  return (
    <div
      style={{
        position: "fixed",
        bottom: "10px",
        left: "10px",
        padding: "12px",
        background: "rgba(15, 23, 42, 0.95)",
        color: "#4ade80",
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: "11px",
        lineHeight: "1.4",
        borderRadius: "8px",
        zIndex: 10000,
        maxWidth: "400px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontWeight: "bold",
          borderBottom: "1px solid rgba(74, 222, 128, 0.3)",
          paddingBottom: "4px",
          marginBottom: "8px",
        }}
      >
        P1 HINT DIAGNOSTICS
      </div>

      <div>
        currentLatex:{" "}
        <span style={{ color: "#22d3ee" }}>{p1.currentLatex}</span>
      </div>
      <div>
        surfaceNodeId:{" "}
        <span style={{ color: "#fbbf24" }}>{p1.selectedSurfaceNodeId}</span>
      </div>
      <div>
        astNodeId:{" "}
        <span style={{ color: astColor }}>{p1.resolvedAstNodeId}</span>
      </div>
      <div>
        primitiveId: <span style={{ color: "#f97316" }}>{p1.primitiveId}</span>
      </div>
      <div>
        hintClickBlocked:{" "}
        <span style={{ color: "#e879f9" }}>{p1.hintClickBlocked}</span>
      </div>
      <div>
        lastTestResult:{" "}
        <span style={{ color: testResultColor }}>{p1.lastTestResult}</span>
      </div>

      <div
        style={{
          fontWeight: "bold",
          marginTop: "12px",
          borderBottom: "1px solid rgba(74, 222, 128, 0.3)",
          paddingBottom: "4px",
          marginBottom: "8px",
        }}
      >
        CHOICE FETCH
      </div>
      <div>
        choiceStatus:{" "}
        <span style={{ color: choiceStatusColor }}>{p1.lastChoiceStatus}</span>
      </div>
      <div>
        choiceTargetPath:{" "}
        <span style={{ color: "#22d3ee" }}>{p1.lastChoiceTargetPath}</span>
      </div>
      <div>
        choiceCount:{" "}
        <span style={{ color: "#22d3ee" }}>{p1.lastChoiceCount}</span>
      </div>

      <div
        style={{
          fontWeight: "bold",
          marginTop: "12px",
          borderBottom: "1px solid rgba(74, 222, 128, 0.3)",
          paddingBottom: "4px",
          marginBottom: "8px",
        }}
      >
        HINT APPLY
      </div>
      <div>
        applyStatus:{" "}
        <span style={{ color: applyStatusColor }}>
          {p1.lastHintApplyStatus}
        </span>
      </div>
      <div>
        applySelectionPath:{" "}
        <span style={{ color: "#22d3ee" }}>
          {p1.lastHintApplySelectionPath}
        </span>
      </div>
      <div>
        applyPreferredPrimitiveId:{" "}
        <span style={{ color: "#22d3ee" }}>
          {p1.lastHintApplyPreferredPrimitiveId}
        </span>
      </div>
      <div>
        applyEndpoint:{" "}
        <span style={{ color: "#22d3ee" }}>{p1.lastHintApplyEndpoint}</span>
      </div>
      <div>
        applyNewLatex:{" "}
        <span style={{ color: "#22d3ee" }}>{p1.lastHintApplyNewLatex}</span>
      </div>
      <div>
        applyError:{" "}
        <span style={{ color: "#f87171" }}>{p1.lastHintApplyError}</span>
      </div>
    </div>
  );
};

export default DiagnosticsPanel;
