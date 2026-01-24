import katex from "katex";
import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { buildAndShowMap } from "../../app/features/rendering/surface-map-builder.js";
import { useViewer } from "../../context/ViewerContext";
import { useMathInstrumentation } from "../../hooks/useMathInstrumentation";
import StableIdBanner from "./StableIdBanner";

interface FormulaViewerProps {
  latex: string;
}

const FormulaViewer = memo(
  forwardRef<HTMLDivElement, FormulaViewerProps>(({ latex }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const { dispatch } = useViewer();

    // Sync external ref if provided
    useImperativeHandle(ref, () => internalRef.current!);

    const { instrumentedLatex, error, isLoading } =
      useMathInstrumentation(latex);

    useEffect(() => {
      if (internalRef.current) {
        console.log("[FormulaViewer] Rendering and building map for:", latex);
        try {
          // 1. Render KaTeX
          katex.render(instrumentedLatex, internalRef.current, {
            throwOnError: false,
            displayMode: true,
            trust: (context) => context.command === "\\htmlData",
            strict: (errorCode) =>
              errorCode === "htmlExtension" ? "ignore" : "warn",
          });

          // 2. Build and Show Map (Synchronous now, ensuring DOM matches map)
          const result = buildAndShowMap(internalRef.current, latex);
          if (result && result.serializable) {
            dispatch({
              type: "SET_SURFACE_MAP",
              payload: result.serializable,
            });
          }
        } catch (err) {
          console.error("KaTeX rendering error:", err);
        }
      }
    }, [instrumentedLatex, latex, dispatch]);

    return (
      <div
        className="viewer-container"
        style={{ opacity: isLoading ? 0.6 : 1 }}
      >
        <StableIdBanner reason={error} />
        <div
          id="formula-container"
          ref={internalRef}
          style={{
            minHeight: "120px",
            border: "1px dashed #ccc",
            padding: "20px",
            margin: "10px 0",
            textAlign: "center",
            transition: "opacity 0.2s",
          }}
        >
          {/* KaTeX will render here */}
        </div>
        <div id="selection-overlay" className="selection-overlay"></div>
        <div id="drag-rect" className="drag-rect"></div>
      </div>
    );
  }),
);

FormulaViewer.displayName = "FormulaViewer";

export default FormulaViewer;
