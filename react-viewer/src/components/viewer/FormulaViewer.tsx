import { memo } from "react";
import { useFormulaViewer } from "../../hooks/useFormulaViewer";

/**
 * FormulaViewer Component
 * Renders mathematical expressions using KaTeX and provides interaction layers.
 */
const FormulaViewer = memo(() => {
  const { containerRef } = useFormulaViewer();

  return (
    <div className="viewer-container" id="p1-formula-viewer">
      <div
        id="formula-container"
        ref={containerRef}
        style={{
          minHeight: "120px",
          border: "1px dashed #ccc",
          padding: "20px",
          margin: "10px 0",
          textAlign: "center",
          transition: "opacity 0.2s",
        }}
      />
      <div id="selection-overlay" className="selection-overlay" />
      <div id="drag-rect" className="drag-rect" />
    </div>
  );
});

FormulaViewer.displayName = "FormulaViewer";

export default FormulaViewer;
