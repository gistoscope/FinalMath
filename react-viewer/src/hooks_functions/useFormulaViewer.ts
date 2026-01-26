import katex from "katex";
import { useEffect, useRef } from "react";
import { displayAdapter } from "../app/features/engine";
import { buildAndShowMap } from "../app/features/rendering/surface-map-builder";
import { useFormulaState, useStoreActions } from "../store/useViewerStore";
import { useEngine } from "./useEngine";
import { useFormulaInteraction } from "./useFormulaInteraction";
import { useMathInstrumentation } from "./useMathInstrumentation";

/**
 * Encapsulates all FormulaViewer logic: engine, interactions, rendering, and events.
 */
export function useFormulaViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { latex } = useFormulaState();
  const { setSurfaceMap } = useStoreActions();

  const { instrumentedLatex, error } = useMathInstrumentation(latex);

  // Initialize Engine and Interactions
  useEngine();
  useFormulaInteraction(containerRef, displayAdapter);

  // KaTeX Rendering Effect
  useEffect(() => {
    if (!containerRef.current) return;
    try {
      katex.render(instrumentedLatex, containerRef.current, {
        throwOnError: false,
        displayMode: true,
        trust: (context) => context.command === "\\htmlData",
        strict: (errorCode) =>
          errorCode === "htmlExtension" ? "ignore" : "warn",
      });

      const result = buildAndShowMap(containerRef.current, latex);
      if (result?.serializable) {
        setSurfaceMap(result.serializable);
      }
    } catch (err) {
      console.error("FormulaViewer render error:", err);
    }
  }, [instrumentedLatex, latex, setSurfaceMap]);

  return { containerRef, error };
}
