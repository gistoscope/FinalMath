import React from "react";
import { useViewer } from "../../context/ViewerContext";

const StepHint: React.FC = () => {
  const { state } = useViewer();
  return (
    <div className="step-hint">
      <div className="step-hint-label">Step hint:</div>
      <div id="tsa-student-hint" className="step-hint-text">
        {state.debug.stepHint || "—"}
      </div>
    </div>
  );
};

export default StepHint;
