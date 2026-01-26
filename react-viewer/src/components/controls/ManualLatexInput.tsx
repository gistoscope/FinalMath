import React from "react";
import { useViewer } from "../../context/ViewerContext";

interface ManualLatexInputProps {
  onLoad: () => void;
}

const ManualLatexInput: React.FC<ManualLatexInputProps> = ({ onLoad }) => {
  const { state, actions } = useViewer();

  return (
    <div
      className="controls"
      style={{
        marginTop: "10px",
        flexDirection: "column",
        alignItems: "stretch",
      }}
    >
      <label htmlFor="manual-latex-input" style={{ marginBottom: "4px" }}>
        Manual LaTeX input:
      </label>
      <textarea
        id="manual-latex-input"
        rows={2}
        value={state.formula.manualInput}
        onChange={(e) => actions.setManualInput(e.target.value)}
        style={{
          width: "100%",
          resize: "vertical",
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        }}
      ></textarea>
      <div style={{ marginTop: "6px" }}>
        <button id="btn-load-latex" className="secondary" onClick={onLoad}>
          Load LaTeX into viewer
        </button>
      </div>
    </div>
  );
};

export default ManualLatexInput;
