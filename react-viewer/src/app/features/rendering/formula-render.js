// features/rendering/formula-render.js
// Formula rendering with KaTeX

import { instrumentLatex } from "../../ast-parser.js";
import { showStableIdDisabledBanner } from "../../core/stable-id.js";
import { getCurrentLatex, stableIdState } from "../../core/state.js";

/**
 * Render LaTeX with KaTeX using trust for \htmlData.
 */
export function doRender(latex, container) {
  if (!window.katex) {
    container.innerHTML = `<div style="color:red; padding:10px;">KaTeX error: window.katex missing</div>`;
    return container;
  }

  try {
    window.katex.render(latex, container, {
      throwOnError: false,
      displayMode: true,
      output: "html",
      trust: (context) => context.command === "\\htmlData",
      strict: (errorCode) =>
        errorCode === "htmlExtension" ? "ignore" : "warn",
    });
  } catch (err) {
    container.innerHTML = `<div style="color:red; padding:10px;">KaTeX internal error: ${err.message}</div>`;
  }

  return container;
}

/**
 * Call backend /api/instrument endpoint for instrumentation.
 * Falls back to original LaTeX if backend fails.
 */
export async function tryBackendInstrumentation(
  latex,
  fallbackLatex,
  container,
  localReason,
) {
  const backendUrl = (
    window.__v5EndpointUrl || "http://localhost:4201/api/orchestrator/v5/step"
  ).replace("/api/orchestrator/v5/step", "/api/instrument");

  try {
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latex }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.instrumentedLatex) {
      // Backend success!
      stableIdState.lastExpression = latex;
      stableIdState.enabled = true;
      stableIdState.reason = null;
      console.log(
        `[STABLE-ID] Backend instrumentation succeeded (${result.tokenCount || "?"} tokens)`,
      );
      doRender(result.instrumentedLatex, container);
      return;
    } else {
      // Backend failed
      const reason = result.reason || "unknown backend error";
      console.log(`[BUG] Backend instrument failed: ${reason}`);
      stableIdState.lastExpression = latex;
      stableIdState.enabled = false;
      stableIdState.reason = reason;
      showStableIdDisabledBanner(reason);
      doRender(fallbackLatex, container);
    }
  } catch (err) {
    // Network or other error
    const reason = `backend unreachable: ${err.message}`;
    console.log(`[BUG] Backend instrument failed: ${reason}`);
    stableIdState.lastExpression = latex;
    stableIdState.enabled = false;
    stableIdState.reason = `local: ${localReason}; ${reason}`;
    showStableIdDisabledBanner(stableIdState.reason);
    doRender(fallbackLatex, container);
  }
}

/**
 * Render the formula to the container
 * @param {string} [latex] - Optional LaTeX expression (falls back to global appState)
 * @param {HTMLElement} [container] - Optional container (falls back to document.getElementById)
 * @returns {HTMLElement|null} The container element
 */
export function renderFormula(latex, container) {
  const currentLatex = latex || getCurrentLatex();
  const targetContainer =
    container || document.getElementById("formula-container");

  if (!targetContainer) return null;

  targetContainer.innerHTML = "";

  // Remove any existing Stable-ID disabled banner
  const existingBanner = document.getElementById("stable-id-banner");
  if (existingBanner) existingBanner.remove();

  if (!window.katex || !window.katex.render) {
    targetContainer.textContent =
      "KaTeX is not available (window.katex missing).";
    return targetContainer;
  }

  // STABLE-ID: Try local instrumentation first
  const localResult = instrumentLatex(currentLatex);

  if (localResult.success) {
    // Local success
    stableIdState.lastExpression = currentLatex;
    stableIdState.enabled = true;
    stableIdState.reason = null;
    console.log("[STABLE-ID] Local instrumentation succeeded");
    doRender(localResult.latex, targetContainer);
  } else {
    // Local failed - try backend
    console.log(
      `[STABLE-ID] Local failed (${localResult.reason}) -> calling backend`,
    );
    tryBackendInstrumentation(
      currentLatex,
      localResult.latex,
      targetContainer,
      localResult.reason,
    );
  }

  return targetContainer;
}
