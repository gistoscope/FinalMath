import React from "react";
import JsonView from "./JsonView";

interface Props {
  result: any;
}

const StepMasterPanel: React.FC<Props> = ({ result }) => {
  if (!result) return <div>No StepMaster data</div>;

  const decision = result.stepMasterOutput?.decision;
  const primitives = result.stepMasterOutput?.primitivesToApply || [];

  return (
    <div className="stepmaster-panel">
      <div className="section-title">Step Decision</div>
      <div className="kv-row">
        <span className="kv-key">Status:</span>
        <span
          className={
            decision?.status === "step-applied" ? "status-ok" : "status-warn"
          }
        >
          {decision?.status || "unknown"}
        </span>
      </div>
      <div className="kv-row">
        <span className="kv-key">Chosen ID:</span>
        <span>{decision?.chosenCandidateId || "-"}</span>
      </div>

      <div className="section-title">
        Primitives to Apply ({primitives.length})
      </div>
      <ul style={{ margin: "4px 0", paddingLeft: "20px", fontSize: "13px" }}>
        {primitives.map((p: any, i: number) => (
          <li key={i}>{p.id}</li>
        ))}
      </ul>

      {result.primitiveDebug && (
        <>
          <div className="section-title">Primitive Debug</div>
          <JsonView data={result.primitiveDebug} />
        </>
      )}

      <div className="section-title">Raw JSON</div>
      <JsonView data={result} />
    </div>
  );
};

export default StepMasterPanel;
