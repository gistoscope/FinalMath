// ui/choice-popup.js
// Choice popup for integer context menu

let currentChoicePopup = null;

/**
 * Show a popup near the clicked element with available choices.
 * @param {Array<{id: string, label: string, primitiveId: string, targetNodeId: string}>} choices
 * @param {{surfaceNodeId?: string, selectionPath?: string}} clickContext
 * @param {string} latex - Current expression latex
 * @param {Function} onApply - Callback when choice is applied (receives primitiveId, targetPath, latex)
 */
export function showChoicePopup(choices, clickContext, latex, onApply) {
  // Remove any existing popup
  hideChoicePopup();

  if (!choices || choices.length === 0) {
    console.log("[ChoicePopup] No choices to display");
    return;
  }

  // Create popup container
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

  // Create choice buttons
  choices.forEach((choice, idx) => {
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
      e.stopPropagation(); // Prevent close handler from firing
      // CRITICAL FIX: Use choice.targetNodeId (from backend) instead of clickContext.selectionPath
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

  // Position popup near formula container center (simple approach)
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

  // Close popup when clicking outside
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

/**
 * Close popup when clicking outside
 */
function closePopupOnClickOutside(event) {
  if (currentChoicePopup && !currentChoicePopup.contains(event.target)) {
    hideChoicePopup();
  }
}

/**
 * Apply a chosen action by sending a new request with preferredPrimitiveId
 * @param {string} primitiveId - The primitive to apply
 * @param {string} selectionPath - The node path
 * @param {string} latex - The current expression
 * @param {Function} onSuccess - Callback on success (receives newLatex)
 */
export async function applyChoice(
  primitiveId,
  selectionPath,
  latex,
  onSuccess,
) {
  console.log(`[ApplyChoice] Applying ${primitiveId} to ${selectionPath}`);

  const endpoint = "http://localhost:4201/api/orchestrator/v5/step";
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
