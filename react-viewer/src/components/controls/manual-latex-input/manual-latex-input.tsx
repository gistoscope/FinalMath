import { useState } from "react";
import { useStoreActions } from "../../../store/useViewerStore";

export const ManualLatexInput = () => {
  const { setLatex: setManualInput } = useStoreActions();

  const [latex, setLatex] = useState<string>("");
  const updateManualInput = () => {
    setManualInput(latex);
  };
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
        value={latex}
        onChange={(e) => setLatex(e.target.value)}
        style={{
          width: "100%",
          resize: "vertical",
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        }}
      />
      <div style={{ marginTop: "6px" }}>
        <button
          id="btn-load-latex"
          className="secondary"
          onClick={updateManualInput}
        >
          Load LaTeX into viewer
        </button>
      </div>
    </div>
  );
};

export default ManualLatexInput;
