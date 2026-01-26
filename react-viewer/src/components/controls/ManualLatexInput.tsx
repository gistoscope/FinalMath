import { eventRecorder, fileBus } from "../../app/features";
import { useAppEvents } from "../../hooks/useAppEvents";
import { useViewerStore } from "../../store/useViewerStore";

const ManualLatexInput = () => {
  const manualInput = useViewerStore((state) => state.formula.manualInput);
  const { setManualInput } = useViewerStore((state) => state.actions);
  const { handleLoadLatex: onLoad } = useAppEvents(eventRecorder, fileBus);

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
        value={manualInput}
        onChange={(e) => setManualInput(e.target.value)}
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
