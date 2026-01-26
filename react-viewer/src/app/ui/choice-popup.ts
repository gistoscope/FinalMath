// ui/choice-popup.ts
// Choice popup for integer context menu

import { getV5EndpointUrl } from "../core/api";

let currentChoicePopup: HTMLElement | null = null;

export interface Choice {
  id: string;
  label: string;
  primitiveId: string;
  targetNodeId: string;
}

export interface ChoiceClickContext {
  surfaceNodeId?: string;
  selectionPath?: string;
}

/**
 * Show a popup near the clicked element with available choices.
 */
export function showChoicePopup(
  choices: Choice[],
  clickContext: ChoiceClickContext,
  latex: string,
  onApply: (primitiveId: string, targetPath: string, latex: string) => void,
) {
  hideChoicePopup();

  if (!choices || choices.length === 0) {
    console.log("[ChoicePopup] No choices to display");
    return;
  }

  const popup = document.createElement("div");
  popup.id = "choice-popup";
  popup.style.cssText = `
    position: absolute;
    z-index: 1000;
    background: white;
    border: 1px solid #ccc;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 8px 0;
    min-width: 160px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
  `;

  choices.forEach((choice) => {
    const btn = document.createElement("button");
    btn.textContent = choice.label;
    btn.dataset.primitiveId = choice.primitiveId;
    btn.dataset.targetNodeId = choice.targetNodeId;
    btn.style.cssText = `
      display: block;
      width: 100%;
      padding: 8px 16px;
      border: none;
      background: transparent;
      text-align: left;
      cursor: pointer;
      color: #333;
    `;
    btn.addEventListener("mouseenter", () => {
      btn.style.background = "#f0f0f0";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "transparent";
    });
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const targetPath =
        choice.targetNodeId || clickContext.selectionPath || "root";
      console.log(
        `[ChoicePopup] Click: primitiveId=${choice.primitiveId}, targetPath=${targetPath}`,
      );
      if (onApply) {
        onApply(choice.primitiveId, targetPath, latex);
      }
      hideChoicePopup();
    });
    popup.appendChild(btn);
  });

  const formulaContainer = document.getElementById("formula-container");
  if (formulaContainer) {
    const rect = formulaContainer.getBoundingClientRect();
    popup.style.left = `${rect.left + rect.width / 2 - 80}px`;
    popup.style.top = `${rect.bottom + 10}px`;
  } else {
    popup.style.left = "50%";
    popup.style.top = "100px";
  }

  document.body.appendChild(popup);
  currentChoicePopup = popup;

  setTimeout(() => {
    document.addEventListener("click", closePopupOnClickOutside, {
      once: true,
      capture: true,
    });
  }, 0);
}

/**
 * Hide choice popup
 */
export function hideChoicePopup() {
  if (currentChoicePopup) {
    currentChoicePopup.remove();
    currentChoicePopup = null;
  }
}

function closePopupOnClickOutside(event: MouseEvent) {
  if (
    currentChoicePopup &&
    !currentChoicePopup.contains(event.target as Node)
  ) {
    hideChoicePopup();
  }
}

/**
 * Apply a chosen action by sending a new request with preferredPrimitiveId
 */
export async function applyChoice(
  primitiveId: string,
  selectionPath: string,
  latex: string,
  onSuccess: (newLatex: string) => void,
) {
  console.log(`[ApplyChoice] Applying ${primitiveId} to ${selectionPath}`);

  const endpoint = getV5EndpointUrl();
  const payload = {
    sessionId: "default-session",
    expressionLatex: latex,
    selectionPath: selectionPath,
    courseId: "default",
    userRole: "student",
    preferredPrimitiveId: primitiveId,
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await response.json();
    console.log("[ApplyChoice] Response:", json);

    if (json.status === "step-applied" && json.expressionLatex) {
      if (onSuccess) {
        onSuccess(json.expressionLatex);
      }
    } else {
      console.warn("[ApplyChoice] Step not applied:", json.status);
    }
  } catch (err) {
    console.error("[ApplyChoice] Error:", err);
  }
}
