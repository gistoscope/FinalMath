import { useEffect, type RefObject } from "react";
import { renderFormula } from "../app/features/rendering/formula-render.js";

export function useFormulaRenderer(
  latex: string,
  containerRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !latex) return;

    console.log("[useFormulaRenderer] Rendering latex:", latex);

    // Explicitly call the rendering logic
    renderFormula(latex, container);

    // Safety check to ensure something rendered
    if (container.innerHTML === "") {
      container.innerHTML = `<span style="color: grey; font-style: italic;">Rendered empty content for: ${latex}</span>`;
    }
  }, [latex, containerRef]);
}
