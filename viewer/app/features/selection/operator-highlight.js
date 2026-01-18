// features/selection/operator-highlight.js
// Smart operator selection and highlighting

import { operatorSelectionState } from "../../core/state.js";
import { paintSelectionRects } from "../../ui/selection-overlay.js";

/**
 * SMART OPERATOR SELECTION: Apply visual highlighting to operator and operands
 * Fetches validation type from backend and paints boxes with appropriate color.
 *
 * @param {Object} context - OperatorSelectionContext
 * @param {Array} boxes - Bounding boxes from getContextBoundingBoxes
 * @param {string} latex - Current expression LaTeX
 * @returns {Promise<string|null>} validationType or null
 */
export async function applyOperatorHighlight(context, boxes, latex) {
  if (!context || !boxes || boxes.length === 0) {
    console.log("[applyOperatorHighlight] No context or boxes provided");
    return null;
  }

  // Update state
  operatorSelectionState.active = true;
  operatorSelectionState.context = context;
  operatorSelectionState.boxes = boxes;

  // Try to get validationType from backend via existing engine adapter
  let validationType = "requires-prep"; // Default to yellow if unknown

  try {
    // Use the validation endpoint or the step endpoint
    const apiBase = window.__engineApiBase || "http://localhost:4001";
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
    } else {
      console.log(
        "[applyOperatorHighlight] Backend validation failed, using default",
      );
    }
  } catch (err) {
    // Fallback: Infer validation type from operand types if backend unavailable
    console.log(
      "[applyOperatorHighlight] Backend unavailable, inferring from operands",
    );

    const leftKind = context.leftOperandSurfaceNode?.kind;
    const rightKind = context.rightOperandSurfaceNode?.kind;
    const isSimpleIntegers = leftKind === "Num" && rightKind === "Num";

    if (isSimpleIntegers) {
      validationType = "direct"; // Integer arithmetic is always direct
    }
    // For fractions, we'd need deeper analysis - default to yellow
  }

  // Store in state
  operatorSelectionState.validationType = validationType;

  // Paint the boxes with appropriate color
  const items = boxes.map((b) => ({
    bbox: b.bbox,
    role: b.role,
  }));

  paintSelectionRects(items, validationType);

  console.log(
    `[applyOperatorHighlight] Painted ${boxes.length} boxes with color=${validationType}`,
  );

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
  window.__currentOperatorContext = null;

  // Clear visual overlay
  const overlay = document.getElementById("selection-overlay");
  if (overlay) {
    overlay.innerHTML = "";
  }

  console.log("[clearOperatorHighlight] Operator highlight cleared");
}
