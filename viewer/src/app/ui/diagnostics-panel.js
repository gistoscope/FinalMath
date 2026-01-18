// ui/diagnostics-panel.js
// P1 Diagnostics panel UI

import { p1DiagnosticsState } from "../core/state.js";

/**
 * Escape HTML entities
 */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Create P1 diagnostics panel (bottom-left)
 */
export function createP1DiagnosticsPanel() {
  let panel = document.getElementById("p1-diagnostics-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "p1-diagnostics-panel";
    panel.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 10px;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.85);
      color: #0f0;
      font-family: monospace;
      font-size: 11px;
      border-radius: 4px;
      z-index: 10000;
      max-width: 400px;
      white-space: pre-wrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(panel);
  }
  return panel;
}

/**
 * Update P1 diagnostics panel with new data
 * @param {object} updates - Properties to update
 * @param {string} currentLatex - Current LaTeX expression
 */
export function updateP1Diagnostics(updates = {}, currentLatex = "") {
  Object.assign(p1DiagnosticsState, updates);
  if (currentLatex) {
    p1DiagnosticsState.currentLatex = currentLatex;
  }

  const panel = createP1DiagnosticsPanel();
  const astColorClass =
    p1DiagnosticsState.resolvedAstNodeId === "MISSING"
      ? "color: red;"
      : "color: lime;";

  panel.innerHTML = `
<b>P1 HINT DIAGNOSTICS</b>
─────────────────────
currentLatex: <span style="color: cyan;">${escapeHtml(p1DiagnosticsState.currentLatex || "N/A")}</span>
surfaceNodeId: <span style="color: yellow;">${p1DiagnosticsState.selectedSurfaceNodeId}</span>
astNodeId: <span style="${astColorClass}">${p1DiagnosticsState.resolvedAstNodeId}</span>
primitiveId: <span style="color: orange;">${p1DiagnosticsState.primitiveId}</span>
hintClickBlocked: <span style="color: magenta;">${p1DiagnosticsState.hintClickBlocked}</span>
lastTestResult: <span style="color: ${p1DiagnosticsState.lastTestResult === "PASS" ? "lime" : p1DiagnosticsState.lastTestResult === "N/A" ? "white" : "red"};">${p1DiagnosticsState.lastTestResult}</span>

<b>CHOICE FETCH</b>
choiceStatus: <span style="color: ${p1DiagnosticsState.lastChoiceStatus === "choice" ? "lime" : "white"};">${p1DiagnosticsState.lastChoiceStatus}</span>
choiceTargetPath: <span style="color: cyan;">${p1DiagnosticsState.lastChoiceTargetPath}</span>
choiceCount: <span style="color: cyan;">${p1DiagnosticsState.lastChoiceCount}</span>

<b>HINT APPLY</b>
applyStatus: <span style="color: ${p1DiagnosticsState.lastHintApplyStatus === "step-applied" ? "lime" : p1DiagnosticsState.lastHintApplyStatus === "RUNNING" ? "yellow" : p1DiagnosticsState.lastHintApplyStatus === "N/A" ? "white" : "red"};">${p1DiagnosticsState.lastHintApplyStatus}</span>
applySelectionPath: <span style="color: cyan;">${p1DiagnosticsState.lastHintApplySelectionPath}</span>
applyPreferredPrimitiveId: <span style="color: cyan;">${p1DiagnosticsState.lastHintApplyPreferredPrimitiveId}</span>
applyEndpoint: <span style="color: cyan;">${escapeHtml(p1DiagnosticsState.lastHintApplyEndpoint || "N/A")}</span>
applyNewLatex: <span style="color: cyan;">${escapeHtml(p1DiagnosticsState.lastHintApplyNewLatex || "N/A")}</span>
applyError: <span style="color: red;">${escapeHtml(p1DiagnosticsState.lastHintApplyError || "N/A")}</span>
`.trim();
}
