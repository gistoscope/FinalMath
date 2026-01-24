import React, { type RefObject } from "react";

interface FormulaViewerProps {
  containerRef: RefObject<HTMLDivElement | null>;
}

const FormulaViewer: React.FC<FormulaViewerProps> = ({ containerRef }) => {
  return (
    <div className="viewer-container">
      <div
        id="formula-container"
        ref={containerRef}
        style={{
          minHeight: "120px",
          border: "1px dashed #ccc",
          padding: "20px",
          margin: "10px 0",
          textAlign: "center",
        }}
      >
        {/* KaTeX will render here */}
      </div>
      <div id="selection-overlay" className="selection-overlay"></div>
      <div id="drag-rect" className="drag-rect"></div>
    </div>
  );
};

export default FormulaViewer;
