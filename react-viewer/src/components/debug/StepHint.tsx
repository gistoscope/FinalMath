import React from "react";
import { useViewerStore } from "../../store/useViewerStore";

const StepHint: React.FC = () => {
  const stepHint = useViewerStore((state) => state.debug.stepHint);
  return (
    <div className="step-hint">
      <div className="step-hint-label">Step hint:</div>
      <div id="tsa-student-hint" className="step-hint-text">
        {stepHint || "—"}
      </div>
    </div>
  );
};

export default StepHint;
