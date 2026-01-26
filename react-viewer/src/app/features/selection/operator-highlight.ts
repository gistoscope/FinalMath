// features/selection/operator-highlight.ts
// Smart operator selection and highlighting

import { getEngineBaseUrl } from "../../core/api";
import { operatorSelectionState } from "../../core/state";
import { paintSelectionRects } from "../../ui/selection-overlay.js";

/**
 * SMART OPERATOR SELECTION: Apply visual highlighting to operator and operands
 */
export async function applyOperatorHighlight(
  context: any,
  boxes: any[],
  latex: string,
): Promise<string | null> {
  if (!context || !boxes || boxes.length === 0) {
    console.log("[applyOperatorHighlight] No context or boxes provided");
    return null;
  }

  // Update state
  operatorSelectionState.active = true;
  operatorSelectionState.context = context;
  operatorSelectionState.boxes = boxes;

  // Try to get validationType from backend
  let validationType = "requires-prep"; // Default to yellow if unknown

  try {
    const apiBase = getEngineBaseUrl();
    const response = await fetch(`${apiBase}/api/v1/validate-operator`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latex: latex,
        operatorPath: context.astPath,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.validationType) {
        validationType = data.validationType;
        console.log(
          "[applyOperatorHighlight] Backend returned validationType:",
          validationType,
        );
      }
    }
  } catch (err) {
    console.log(
      "[applyOperatorHighlight] Backend unavailable, inferring from operands",
    );

    const leftKind = context.leftOperandSurfaceNode?.kind;
    const rightKind = context.rightOperandSurfaceNode?.kind;
    const isSimpleIntegers = leftKind === "Num" && rightKind === "Num";

    if (isSimpleIntegers) {
      validationType = "direct";
    }
  }

  // Store in state
  operatorSelectionState.validationType = validationType;

  // Paint the boxes with appropriate color
  const items = boxes.map((b) => ({
    bbox: b.bbox,
    role: b.role,
  }));

  paintSelectionRects(items, validationType);

  return validationType;
}

/**
 * SMART OPERATOR SELECTION: Clear operator highlighting
 */
export function clearOperatorHighlight() {
  operatorSelectionState.active = false;
  operatorSelectionState.validationType = null;
  operatorSelectionState.context = null;
  operatorSelectionState.boxes = [];

  // Clear visual overlay
  const overlay = document.getElementById("selection-overlay");
  if (overlay) {
    overlay.innerHTML = "";
  }

  console.log("[clearOperatorHighlight] Operator highlight cleared");
}
