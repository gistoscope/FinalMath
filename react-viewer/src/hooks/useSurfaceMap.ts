import { useEffect, useState, type RefObject } from "react";
import { buildAndShowMap } from "../app/features/rendering/surface-map-builder.js";

export function useSurfaceMap(
  latex: string,
  containerRef: RefObject<HTMLDivElement | null>,
) {
  const [isBuilding, setIsBuilding] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!latex || !container) return;

    const runBuild = async () => {
      setIsBuilding(true);
      // Wait for next tick to ensure DOM is painted (KaTeX done)
      await new Promise((r) => setTimeout(r, 0));

      try {
        buildAndShowMap(container, latex);
      } catch (e) {
        console.error("Map build failed", e);
      } finally {
        setIsBuilding(false);
      }
    };

    runBuild();
  }, [latex, containerRef]);

  return { isBuilding };
}
