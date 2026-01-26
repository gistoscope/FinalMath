import katex from "katex";
import { useEffect, useRef } from "react";
import {
  displayAdapter,
  fileBus,
  initializeAdapters,
} from "../app/features/engine";
import { buildAndShowMap } from "../app/features/rendering/surface-map-builder";
import { useFormulaState, useStoreActions } from "../store/useViewerStore";
import { FormulaInteraction } from "./FormulaInteraction";
import { processInstrumentation } from "./MathInstrumentation";

/**
 * Encapsulates all FormulaViewer logic: engine, interactions, rendering, and events.
 */
export function useFormulaViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { latex } = useFormulaState();
  const { setSurfaceMap, setLatex } = useStoreActions();

  const { instrumentedLatex } = processInstrumentation(latex);

  // KaTeX Rendering Effect
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsubscribe = fileBus.subscribe((msg: any) => {
      if (!msg) return;

      switch (msg.messageType) {
        case "EngineResponse": {
          const res = msg.payload.result;

          setLatex(res.latex);
          break;
        }
        default:
          return;
      }
    });
    // init the event engine
    initializeAdapters();

    const interaction = new FormulaInteraction(containerRef, displayAdapter);

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
    return () => {
      unsubscribe();
      interaction.removeListeners();
    };
  }, [instrumentedLatex, latex, setSurfaceMap, setLatex]);

  return { containerRef };
}
