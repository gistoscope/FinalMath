/* eslint-disable @typescript-eslint/no-explicit-any */
import katex from "katex";
import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

import { Tokens } from "../../new_app/di/tokens";
import { MathEngine } from "../../new_app/domain/math/engine/MathEngine";
import type { IMapEngine } from "../../new_app/domain/surface-map/interfaces/IMapEngine";
import { useAugmentedLatex } from "../../new_app/hooks/useAugmentedLatex";
import { useInteraction } from "../../new_app/hooks/useInteraction";
import type { IStoreService } from "../../new_app/store/interfaces/IStoreService";
import { useService } from "../../new_app/useService";
import SelectionOverlay from "./SelectionOverlay";
import StableIdBanner from "./StableIdBanner";

interface FormulaViewerProps {
  latex: string;
}

const FormulaViewer = memo(
  forwardRef<HTMLDivElement, FormulaViewerProps>(({ latex }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const renderRef = useRef<HTMLDivElement>(null);

    // Services
    const mathEngine = useService<MathEngine>(Tokens.IMathEngine);
    const mapEngine = useService<IMapEngine>(Tokens.IMapEngine);
    const store = useService<IStoreService>(Tokens.IStoreService);

    // Interaction Hook
    const { onPointerDown, onPointerMove, onPointerUp } =
      useInteraction(containerRef);

    // Sync external ref if provided
    useImperativeHandle(ref, () => containerRef.current!);

    // Instrumentation State
    const { instrumentedLatex, error, isLoading } = useAugmentedLatex(latex);

    useEffect(() => {
      if (renderRef.current && containerRef.current && instrumentedLatex) {
        console.log("[FormulaViewer] Rendering and building map for:", latex);
        try {
          // 1. Render KaTeX into the inner target
          katex.render(instrumentedLatex, renderRef.current, {
            throwOnError: false,
            displayMode: true,
            trust: (context) => context.command === "\\htmlData",
            strict: (errorCode) =>
              errorCode === "htmlExtension" ? "ignore" : "warn",
          });

          // 2. Build Surface Map relative to the outer container
          // This ensures that bboxes match the container's coordinate system
          const mapResult = mapEngine.initialize(containerRef.current);
          if (mapResult) {
            store.setSurfaceMap(mapResult);
            (window as any).__currentSurfaceMap = mapResult;
          }
        } catch (err) {
          console.error("KaTeX rendering error:", err);
        }
      }
    }, [instrumentedLatex, latex, mathEngine, mapEngine, store]);

    return (
      <div
        className="viewer-container"
        style={{ opacity: isLoading ? 0.6 : 1 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <StableIdBanner reason={error} />
        <div
          id="formula-container"
          ref={containerRef}
          className="formula-render-area"
          style={{
            position: "relative",
            minHeight: "120px",
            border: "1px dashed #ccc",
            padding: "20px",
            margin: "10px 0",
            textAlign: "center",
            transition: "opacity 0.2s",
            touchAction: "none",
          }}
        >
          <div ref={renderRef} id="katex-render-target" />
          <SelectionOverlay />
        </div>
      </div>
    );
  }),
);

FormulaViewer.displayName = "FormulaViewer";

export default FormulaViewer;
