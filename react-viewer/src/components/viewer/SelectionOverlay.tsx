import React, { useMemo } from "react";
import type { BoundingBoxItem } from "../../new_app/domain/selection/models/OperatorSelectionContext";
import type { BBox } from "../../new_app/domain/surface-map/models/SurfaceNode";
import { useViewerStore } from "../../store/useViewerStore";

const SelectionOverlay: React.FC = () => {
  const selection = useViewerStore((state) => state.selection);
  const operatorSelection = useViewerStore((state) => state.operatorSelection);
  const surfaceMapJson = useViewerStore((state) => state.system.surfaceMapJson);

  const hoverState = useViewerStore((state) => state.debug.hover);

  const selectionRects = useMemo(() => {
    // Helper to find bbox by id from surface map
    const getBBox = (id: string): BBox | null => {
      const map = surfaceMapJson as {
        atoms?: { id: string; bbox: BBox }[];
      } | null;
      if (!map || !map.atoms) return null;
      const atom = map.atoms.find((a) => a.id === id);
      return atom ? atom.bbox : null;
    };

    const rects: { id: string; bbox: BBox; color: string; border?: string }[] =
      [];

    // Hover Selection
    if (hoverState.target) {
      // The target string format is "Kind (ID)"
      const match = /\(([^)]+)\)/.exec(hoverState.target);
      if (match && match[1]) {
        const hoverId = match[1];
        const bbox = getBBox(hoverId);
        if (bbox) {
          rects.push({
            id: `hover-${hoverId}`,
            bbox,
            color: "rgba(100, 100, 100, 0.1)",
            border: "1px dashed rgba(100, 100, 100, 0.5)",
          });
        }
      }
    }

    // Normal Selection
    const ids = Array.from(selection.selectedIds);
    for (const id of ids) {
      const bbox = getBBox(id);
      if (bbox) {
        rects.push({
          id,
          bbox,
          color: "rgba(74, 222, 128, 0.3)", // Green
        });
      }
    }

    // Operator Selection
    if (operatorSelection.active && operatorSelection.boxes) {
      const validationType = operatorSelection.validationType;
      let color = "rgba(251, 191, 36, 0.3)"; // Yellow (requires-prep)

      if (validationType === "direct" || validationType === "valid") {
        color = "rgba(74, 222, 128, 0.4)"; // Green
      } else if (validationType === "invalid") {
        color = "rgba(248, 113, 113, 0.4)"; // Red
      }

      const boxes = operatorSelection.boxes as BoundingBoxItem[];
      for (const boxItem of boxes) {
        if (boxItem.bbox) {
          rects.push({
            id: `op-${boxItem.role}`,
            bbox: boxItem.bbox,
            color,
          });
        }
      }
    }

    return rects;
  }, [selection, operatorSelection, surfaceMapJson, hoverState]);

  return (
    <div
      className="selection-layer"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      {selectionRects.map((rect, idx) => (
        <div
          key={`${rect.id}-${idx}`}
          style={{
            position: "absolute",
            left: rect.bbox.left,
            top: rect.bbox.top,
            width: rect.bbox.right - rect.bbox.left,
            height: rect.bbox.bottom - rect.bbox.top,
            backgroundColor: rect.color,
            border:
              rect.border ||
              `1px solid ${rect.color.replace("0.3", "0.8").replace("0.4", "1")}`,
            borderRadius: "4px",
          }}
        />
      ))}
    </div>
  );
};

export default SelectionOverlay;
