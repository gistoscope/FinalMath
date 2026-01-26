import React from "react";
import JsonView from "./JsonView";

interface Props {
  result: any;
}

const MapMasterPanel: React.FC<Props> = ({ result }) => {
  if (!result) return <div>No MapMaster data</div>;

  const p = result.pipeline;

  const getStatusClass = (status: string) => {
    if (["ok", "found", "candidates-produced", "chosen"].includes(status))
      return "status-ok";
    if (["error", "invalid", "no-anchor"].includes(status))
      return "status-error";
    return "status-warn";
  };

  return (
    <div className="mapmaster-panel">
      <div className="section-title">Selection Pipeline</div>
      <div className="kv-row">
        <span className="kv-key">Status:</span>
        <span className={getStatusClass(p.selection.status)}>
          {p.selection.status}
        </span>
      </div>
      <div className="kv-row">
        <span className="kv-key">Anchor:</span>
        <span>{p.selection.anchorNodeId || "-"}</span>
      </div>
      <div className="kv-row">
        <span className="kv-key">Kind:</span>
        <span>{p.selection.anchorKind || "-"}</span>
      </div>

      <div className="section-title">Window</div>
      <div className="kv-row">
        <span className="kv-key">Status:</span>
        <span className={getStatusClass(p.window.status)}>
          {p.window.status}
        </span>
      </div>
      <div className="kv-row">
        <span className="kv-key">Nodes:</span>
        <span>{p.window.nodeIds?.join(", ") || "-"}</span>
      </div>

      <div className="section-title">
        Candidates ({result.candidates?.length || 0})
      </div>
      {result.candidates?.map((c: any) => (
        <div key={c.id} className="candidate-card">
          <div
            style={{ fontWeight: 600, color: "#2563eb", marginBottom: "4px" }}
          >
            {c.id}
          </div>
          <div className="kv-row">
            <span className="kv-key">Desc:</span>
            <span>{c.description}</span>
          </div>
          <div className="kv-row">
            <span className="kv-key">Prims:</span>
            <span>{c.primitiveIds?.join(", ")}</span>
          </div>
          <div className="kv-row">
            <span className="kv-key">Target:</span>
            <span>{c.targetPath}</span>
          </div>
        </div>
      ))}

      <div className="section-title">Raw JSON</div>
      <JsonView data={result} />
    </div>
  );
};

export default MapMasterPanel;
