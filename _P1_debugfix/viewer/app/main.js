// main.js
// Demo: canonical KaTeX formula + SurfaceNodeMap + interactive hover/click.

import { buildSurfaceNodeMap, surfaceMapToSerializable, enhanceSurfaceMap, correlateOperatorsWithAST, correlateIntegersWithAST, hitTestPoint } from "./surface-map.js";

// Expose hitTestPoint globally for coordinate-based hit-testing
if (typeof window !== "undefined") {
  window.__surfaceMapUtils = { hitTestPoint };
}
import { DisplayAdapter, ClientEventRecorder } from "./display-adapter.js";
import { FileBus } from "./filebus.js";
import { EngineAdapter } from "./engine-adapter.js";
import { runV5Step } from "./client/orchestratorV5Client.js";

// Test suite (6 distinct LaTeX expressions)
const TESTS = [
  // T14: fraction addition same denominator
  String.raw`\frac{1}{7} + \frac{3}{7}`,
  // T15: fraction subtraction same denominator
  String.raw`\frac{5}{9} - \frac{2}{9}`,
  // T0: simple integers
  String.raw`2+3`,
  // T1: simple fractions
  String.raw`\frac{1}{3}+\frac{2}{5}`,
  // T2: nested fraction
  String.raw`\frac{1}{1+\frac{1}{2}}`,
  // T3: unary minus + brackets
  String.raw`-\left(\frac{3}{4}-\frac{1}{8}\right)`,
  // T4: decimals
  String.raw`12.5 + 0.75 - 3.125`,
  // T5: mixed numbers
  String.raw`1\frac{2}{3} + 2\frac{1}{5}`,
  // T6: two integer operations
  String.raw`2 + 3 - 1`,
  // T7: three fractions
  String.raw`\frac{1}{2} + \frac{1}{3} + \frac{1}{6}`,
  // T8: brackets + multiply
  String.raw`\left(1-\frac{1}{3}\right)\cdot\frac{3}{4}`,
  // T9: subtraction with inner sum
  String.raw`\frac{2}{5} - \left(\frac{1}{10}+\frac{3}{20}\right)`,
  // T10: two bracketed groups
  String.raw`\left(\frac{1}{2}+\frac{2}{3}\right)-\left(\frac{3}{4}-\frac{1}{5}\right)`,
  // T11: mixed decimals & fractions
  String.raw`1.2 + \frac{3}{5} - 0.4`,
  // T12: stress nested
  String.raw`\frac{1}{2} + \left(\frac{3}{4} - \frac{1}{1+\frac{1}{2}}\right)`,
  // T13: extra mix
  String.raw`\left(\frac{5}{6} - \frac{1}{3}\right) + \frac{7}{8}`,
];

let currentLatex = TESTS[0];

let current = null;
let lastHoverNode = null;

// Selection engine state
const selectionState = {
  mode: "none",           // "none" | "single" | "multi" | "rect"
  primaryId: null,
  selectedIds: new Set(),
};

// P1: Integer click-cycle state
// Single click cycles mode, double click applies action
const integerCycleState = {
  selectedNodeId: null,      // surfaceNodeId of currently selected integer
  astNodeId: null,           // AST path of selected integer
  cycleIndex: 0,             // Current mode: 0 = Green (Convert to Frac), 1 = Orange (Factor Primes)
  primitives: [
    { id: "P.INT_TO_FRAC", label: "Convert to fraction", color: "#4CAF50" },     // Green
    { id: "P.INT_FACTOR_PRIMES", label: "Factor to primes", color: "#FF9800" },  // Orange
  ],
  // Double-click detection state
  pendingClickTimeout: null, // Timeout ID for delayed single-click processing
  lastClickTime: 0,          // Timestamp of last click
  lastClickNodeId: null,     // Node ID of last click
};

// P1: Prevent re-entry while hint apply is in progress
const hintApplyState = { applying: false };

// P1 double-click threshold in milliseconds
const P1_DOUBLE_CLICK_THRESHOLD = 350;

// P1: Diagnostics panel state
const p1DiagnosticsState = {
  currentLatex: "",
  selectedSurfaceNodeId: "N/A",
  resolvedAstNodeId: "N/A",
  primitiveId: "N/A",
  hintClickBlocked: "N/A",
  lastTestResult: "N/A",

  // Choice fetch (integer click) diagnostics
  lastChoiceStatus: "N/A",
  lastChoiceTargetPath: "N/A",
  lastChoiceCount: "0",

  // Hint-apply diagnostics (green hint click / double-click)
  lastHintApplyStatus: "N/A",
  lastHintApplySelectionPath: "N/A",
  lastHintApplyPreferredPrimitiveId: "N/A",
  lastHintApplyEndpoint: "N/A",
  lastHintApplyNewLatex: "N/A",
  lastHintApplyError: "N/A"
};

// P1: Create and update diagnostics panel (bottom-left)
function createP1DiagnosticsPanel() {
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

function updateP1Diagnostics(updates = {}) {
  Object.assign(p1DiagnosticsState, updates);
  if (typeof currentLatex !== "undefined") {
    p1DiagnosticsState.currentLatex = currentLatex;
  }

  const panel = createP1DiagnosticsPanel();
  const astColorClass = p1DiagnosticsState.resolvedAstNodeId === "MISSING" ? "color: red;" : "color: lime;";

  panel.innerHTML = `
<b>P1 HINT DIAGNOSTICS</b>
─────────────────────
currentLatex: <span style="color: cyan;">${escapeHtml(p1DiagnosticsState.currentLatex || "N/A")}</span>
surfaceNodeId: <span style="color: yellow;">${p1DiagnosticsState.selectedSurfaceNodeId}</span>
astNodeId: <span style="${astColorClass}">${p1DiagnosticsState.resolvedAstNodeId}</span>
primitiveId: <span style="color: orange;">${p1DiagnosticsState.primitiveId}</span>
hintClickBlocked: <span style="color: magenta;">${p1DiagnosticsState.hintClickBlocked}</span>
lastTestResult: <span style="color: ${p1DiagnosticsState.lastTestResult === "PASS" ? "lime" : (p1DiagnosticsState.lastTestResult === "N/A" ? "white" : "red")};">${p1DiagnosticsState.lastTestResult}</span>

<b>CHOICE FETCH</b>
choiceStatus: <span style="color: ${p1DiagnosticsState.lastChoiceStatus === "choice" ? "lime" : "white"};">${p1DiagnosticsState.lastChoiceStatus}</span>
choiceTargetPath: <span style="color: cyan;">${p1DiagnosticsState.lastChoiceTargetPath}</span>
choiceCount: <span style="color: cyan;">${p1DiagnosticsState.lastChoiceCount}</span>

<b>HINT APPLY</b>
applyStatus: <span style="color: ${p1DiagnosticsState.lastHintApplyStatus === "step-applied" ? "lime" : (p1DiagnosticsState.lastHintApplyStatus === "RUNNING" ? "yellow" : (p1DiagnosticsState.lastHintApplyStatus === "N/A" ? "white" : "red"))};">${p1DiagnosticsState.lastHintApplyStatus}</span>
applySelectionPath: <span style="color: cyan;">${p1DiagnosticsState.lastHintApplySelectionPath}</span>
applyPreferredPrimitiveId: <span style="color: cyan;">${p1DiagnosticsState.lastHintApplyPreferredPrimitiveId}</span>
applyEndpoint: <span style="color: cyan;">${escapeHtml(p1DiagnosticsState.lastHintApplyEndpoint || "N/A")}</span>
applyNewLatex: <span style="color: cyan;">${escapeHtml(p1DiagnosticsState.lastHintApplyNewLatex || "N/A")}</span>
applyError: <span style="color: red;">${escapeHtml(p1DiagnosticsState.lastHintApplyError || "N/A")}</span>
`.trim();
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// P1: Self-test function (can be triggered from console: window.runP1SelfTest())
async function runP1SelfTest() {
  console.log("[P1-SELF-TEST] Starting self-test...");
  updateP1Diagnostics({ lastTestResult: "RUNNING..." });

  // Save current state
  const originalLatex = currentLatex;

  // Set test expression
  currentLatex = "2+3";
  renderFormula();
  buildAndShowMap();
  await new Promise(r => setTimeout(r, 300));

  // Simulate clicking "2" (first integer)
  const map = window.__currentSurfaceMap;
  if (!map || !map.atoms) {
    console.error("[P1-SELF-TEST] FAIL: No surface map available");
    updateP1Diagnostics({ lastTestResult: "FAIL: No surface map" });
    return;
  }

  const firstNum = map.atoms.find(n => n.kind === "Num");
  if (!firstNum) {
    console.error("[P1-SELF-TEST] FAIL: No Num node found");
    updateP1Diagnostics({ lastTestResult: "FAIL: No Num node" });
    return;
  }

  // Select the integer
  integerCycleState.selectedNodeId = firstNum.id;
  integerCycleState.astNodeId = firstNum.astNodeId;
  integerCycleState.cycleIndex = 0; // GREEN mode
  applyIntegerHighlight(firstNum.id, 0);
  await new Promise(r => setTimeout(r, 300));

  // Apply P1 action (simulating hint click)
  await applyP1Action(firstNum.id, firstNum.astNodeId, 0);
  await new Promise(r => setTimeout(r, 500));

  // Check result
  const expected = "\\frac{2}{1}+3";
  const passed = currentLatex === expected;

  if (passed) {
    console.log("[P1-SELF-TEST] PASS: Expression correctly converted to", currentLatex);
    updateP1Diagnostics({ lastTestResult: "PASS" });
  } else {
    console.error("[P1-SELF-TEST] FAIL: Expected", expected, "but got", currentLatex);
    updateP1Diagnostics({ lastTestResult: `FAIL: got "${currentLatex}"` });
  }

  // Restore original
  currentLatex = originalLatex;
  renderFormula();
  buildAndShowMap();
  resetIntegerCycleState();

  return passed;
}

// Expose self-test globally
if (typeof window !== "undefined") {
  window.runP1SelfTest = runP1SelfTest;
}

// P1: Clear integer selection on expression change
function resetIntegerCycleState() {
  // Clear any pending click timeout
  if (integerCycleState.pendingClickTimeout) {
    clearTimeout(integerCycleState.pendingClickTimeout);
    integerCycleState.pendingClickTimeout = null;
  }
  integerCycleState.selectedNodeId = null;
  integerCycleState.astNodeId = null;
  integerCycleState.cycleIndex = 0;
  integerCycleState.lastClickTime = 0;
  integerCycleState.lastClickNodeId = null;
  clearIntegerHighlight();
  console.log("[P1] Reset integer cycle state");
}

// P1: Apply visual highlight to selected integer
function applyIntegerHighlight(surfaceNodeId, cycleIndex) {
  clearIntegerHighlight();
  const primitive = integerCycleState.primitives[cycleIndex];
  const el = document.querySelector(`[data-surface-id="${surfaceNodeId}"]`);
  if (el) {
    el.classList.add("p1-integer-selected");
    el.style.setProperty("--p1-highlight-color", primitive.color);
    console.log(`[P1] Applied highlight to ${surfaceNodeId} with color ${primitive.color} (mode=${cycleIndex})`);
  }
  // Also show mode indicator (now clickable)
  showModeIndicator(primitive, surfaceNodeId, cycleIndex);
}

function clearIntegerHighlight() {
  document.querySelectorAll(".p1-integer-selected").forEach(el => {
    el.classList.remove("p1-integer-selected");
    el.style.removeProperty("--p1-highlight-color");
  });
  hideModeIndicator();
}

// P1: Show clickable mode indicator with CAPTURE-PHASE BLOCKING
function showModeIndicator(primitive, surfaceNodeId, cycleIndex) {
  let indicator = document.getElementById("p1-hint-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "p1-hint-indicator";
    indicator.className = "p1-hint-container"; // For guard checks
    indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: bold;
      color: white;
      z-index: 9999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: pointer;
      user-select: none;
      transition: transform 0.1s, box-shadow 0.1s;
    `;

    // CAPTURE-PHASE BLOCKING: Prevent ALL events from reaching global handlers
    const captureBlocker = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log(`[P1-HINT][BLOCK] Blocked ${e.type} in capture phase`);
      updateP1Diagnostics({ hintClickBlocked: "YES" });
    };

    // Add capture-phase blockers
    indicator.addEventListener("pointerdown", captureBlocker, { capture: true });
    indicator.addEventListener("mousedown", captureBlocker, { capture: true });

    // Add hover effect
    indicator.addEventListener("mouseenter", () => {
      indicator.style.transform = "scale(1.02)";
      indicator.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
    });
    indicator.addEventListener("mouseleave", () => {
      indicator.style.transform = "scale(1)";
      indicator.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
    });

    document.body.appendChild(indicator);
  }

  indicator.textContent = `${primitive.label} (click to apply)`;
  indicator.style.backgroundColor = primitive.color;
  indicator.style.display = "block";

  // Update diagnostics
  updateP1Diagnostics({
    selectedSurfaceNodeId: surfaceNodeId,
    resolvedAstNodeId: integerCycleState.astNodeId || "MISSING",
    primitiveId: primitive.id,
    hintClickBlocked: "N/A"
  });

  // Make indicator clickable - applies the current mode's action
  // Using onclick (bubbling phase) after capture blockers have run
  indicator.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // Prevent re-entry
    if (hintApplyState && hintApplyState.applying) {
      console.log("[P1-HINT] Ignored: already applying");
      return;
    }

    console.log(`[P1-HINT] Hint clicked: requesting apply for ${primitive.id} on node ${surfaceNodeId}`);

    if (hintApplyState) hintApplyState.applying = true;

    updateP1Diagnostics({
      hintClickBlocked: "YES - applying",
      lastHintApplyStatus: "RUNNING",
      lastHintApplySelectionPath: integerCycleState.astNodeId || "MISSING",
      lastHintApplyPreferredPrimitiveId: primitive.id,
      lastHintApplyEndpoint: (typeof window !== "undefined" && window.__v5EndpointUrl) ? window.__v5EndpointUrl : V5_ENDPOINT_URL,
      lastHintApplyNewLatex: "N/A",
      lastHintApplyError: "N/A"
    });

    try {
      // Ensure AST nodeId + backend choices are available (even if click event had astNodeId missing)
      const ctx = await ensureP1IntegerContext(surfaceNodeId, integerCycleState.astNodeId);

      // Keep diagnostics in sync with resolved target
      updateP1Diagnostics({
        resolvedAstNodeId: ctx.astNodeId || "MISSING",
        lastHintApplySelectionPath: ctx.astNodeId || "MISSING",
        primitiveId: primitive.id
      });

      // Apply the currently selected primitive (cycleIndex)
      await applyP1Action(surfaceNodeId, ctx.astNodeId, cycleIndex);
    } catch (err) {
      console.error("[P1-HINT][ERROR] Apply failed:", err);
      updateP1Diagnostics({
        lastHintApplyStatus: "engine-error",
        lastHintApplyError: err instanceof Error ? err.message : String(err)
      });
    } finally {
      if (hintApplyState) hintApplyState.applying = false;
    }
  };
}

function hideModeIndicator() {
  const indicator = document.getElementById("p1-hint-indicator");
  if (indicator) {
    indicator.style.display = "none";
    indicator.onclick = null; // Clear click handler
  }
}


// P1: Ensure we have a valid AST nodeId + up-to-date choice list for the currently selected integer.
// This makes hint-apply robust even when surface map correlation fails (astNodeId missing).
async function ensureP1IntegerContext(surfaceNodeId, fallbackAstNodeId = null) {
  // 1) Prefer explicit astNodeId from event/state
  let astNodeId = fallbackAstNodeId || integerCycleState.astNodeId || null;

  // 2) Try to find it on the current surface map (if available)
  if (!astNodeId && typeof window !== "undefined" && window.__currentSurfaceMap && Array.isArray(window.__currentSurfaceMap.atoms)) {
    const node = window.__currentSurfaceMap.atoms.find(a => a && a.id === surfaceNodeId);
    if (node && node.astNodeId) astNodeId = node.astNodeId;
  }

  // 3) If we still don't have it OR we want authoritative choices, ask backend for a "choice" response.
  // The orchestrator can resolve the correct integer target even when selectionPath is null/root.
  const endpointUrl = (typeof window !== "undefined" && window.__v5EndpointUrl) ? window.__v5EndpointUrl : V5_ENDPOINT_URL;

  const choicePayload = {
    sessionId: "default-session",
    expressionLatex: currentLatex,
    selectionPath: astNodeId, // may be null
    userRole: "student",
    userId: "student",
    courseId: "default-course",
    surfaceNodeKind: "Num"
    // IMPORTANT: no preferredPrimitiveId here; we want status="choice"
  };

  updateP1Diagnostics({
    selectedSurfaceNodeId: surfaceNodeId || "N/A",
    resolvedAstNodeId: astNodeId || "MISSING",
    lastChoiceStatus: "RUNNING",
    lastChoiceTargetPath: astNodeId || "N/A",
    lastChoiceCount: String(integerCycleState.primitives?.length || 0)
  });

  const result = await runV5Step(endpointUrl, choicePayload, 8000);

  // Backend standardized response: { status, choices, rawResponse.json.debugInfo ... }
  if (result && (String(result.status || "") === "choice" || String(result.status || "").includes("choice")) && Array.isArray(result.choices) && result.choices.length > 0) {
    const choices = result.choices;

    // If backend provides a targetNodeId, use it as authoritative astNodeId
    const targetNodeId = choices[0].targetNodeId || astNodeId || null;
    astNodeId = targetNodeId;

    // Rebuild primitives list from backend choices (stable + future-proof)
    integerCycleState.primitives = choices.map((c, idx) => ({
      id: c.primitiveId,
      label: c.label,
      // Color convention: first choice = green; others = orange (until we add richer palette)
      color: idx === 0 ? "#4CAF50" : "#FF9800",
      targetNodeId: c.targetNodeId || targetNodeId
    }));

    updateP1Diagnostics({
      resolvedAstNodeId: astNodeId || "MISSING",
      primitiveId: integerCycleState.primitives[integerCycleState.cycleIndex]?.id || "N/A",
      lastChoiceStatus: "choice",
      lastChoiceTargetPath: astNodeId || "N/A",
      lastChoiceCount: String(integerCycleState.primitives.length),
      lastHintApplyError: "N/A"
    });

    // Keep integerCycleState.astNodeId in sync
    integerCycleState.astNodeId = astNodeId;
    return { astNodeId, primitives: integerCycleState.primitives };
  }

  // Not a choice response or error
  const errMsg = (result && result.rawResponse && result.rawResponse.error) ? String(result.rawResponse.error) : "No choice response";
  updateP1Diagnostics({
    resolvedAstNodeId: astNodeId || "MISSING",
    lastChoiceStatus: result ? result.status : "engine-error",
    lastChoiceTargetPath: astNodeId || "N/A",
    lastChoiceCount: String(integerCycleState.primitives?.length || 0),
    lastHintApplyError: errMsg
  });

  // Still return what we have (may be null)
  integerCycleState.astNodeId = astNodeId;
  return { astNodeId, primitives: integerCycleState.primitives };
}


// P1: Apply action for the current mode (GREEN or ORANGE)
// This sends an applyStep request to the backend
async function applyP1Action(surfaceNodeId, astNodeId, cycleIndex) {
  // Ensure we have an AST selectionPath. If missing, try to resolve via backend choice response.
  if (!astNodeId) {
    try {
      const ctx = await ensureP1IntegerContext(surfaceNodeId, null);
      astNodeId = ctx.astNodeId;
    } catch (err) {
      console.warn("[P1-HINT-APPLY] Failed to resolve astNodeId via ensureP1IntegerContext:", err);
    }
  }

  const primitive = integerCycleState.primitives[cycleIndex];
  if (!primitive) {
    console.warn("[P1-APPLY] No primitive for cycleIndex", cycleIndex);
    return;
  }

  console.log(`[P1-APPLY] === Hint/DblClick Apply Action ===`);
  console.log(`[P1-APPLY] surfaceNodeId: ${surfaceNodeId}`);
  console.log(`[P1-APPLY] astNodeId (param): ${astNodeId}`);
  console.log(`[P1-APPLY] integerCycleState.astNodeId: ${integerCycleState.astNodeId}`);
  console.log(`[P1-APPLY] primitive: ${primitive.id}`);
  console.log(`[P1-APPLY] currentLatex: "${currentLatex}"`);

  // ROBUST FALLBACK CHAIN for selectionPath:
  // 1. Provided astNodeId (from P1 state or event)
  // 2. integerCycleState.astNodeId (stored during single-click)
  // 3. Look up from current surface map using surfaceNodeId
  // 4. "root" ONLY if the expression is a single isolated integer
  let targetPath = astNodeId || integerCycleState.astNodeId;

  // If still no targetPath, try to look it up from the current surface map
  if (!targetPath && surfaceNodeId && typeof window !== "undefined" && window.__currentSurfaceMap) {
    const map = window.__currentSurfaceMap;
    const surfaceNode = map.atoms?.find(n => n.id === surfaceNodeId);
    if (surfaceNode && surfaceNode.astNodeId) {
      targetPath = surfaceNode.astNodeId;
      console.log(`[P1-APPLY] Found astNodeId from surface map: "${targetPath}"`);
    }
  }

  // Check if we need "root" fallback - ONLY for isolated integers
  if (!targetPath) {
    const latex = typeof currentLatex === "string" ? currentLatex.trim() : "";
    // Check if expression is just a single integer (e.g., "3", "12", "456")
    const isIsolatedInteger = /^-?\d+$/.test(latex);

    if (isIsolatedInteger) {
      targetPath = "root";
      console.log(`[P1-APPLY] Using "root" - expression "${latex}" is an isolated integer`);
    } else {
      console.error(`[P1-APPLY] ERROR: No valid astNodeId for non-isolated integer expression!`);
      console.error(`[P1-APPLY] This likely means correlateIntegersWithAST did not assign an astNodeId to the clicked integer.`);
      console.error(`[P1-APPLY] Expression: "${latex}", surfaceNodeId: ${surfaceNodeId}`);
      console.error(`[P1-APPLY] ABORTING - would incorrectly target root node.`);
      return;
    }
  }

  console.log(`[P1-APPLY] targetPath (resolved): ${targetPath}`);

  // Define payload and endpoint FIRST, then use them in diagnostics
  const v5Payload = {
    sessionId: "default-session",
    expressionLatex: typeof currentLatex === "string" ? currentLatex : "",
    selectionPath: targetPath,
    preferredPrimitiveId: primitive.id,
    courseId: "default",
    userRole: "student",
    surfaceNodeKind: "Num",
  };

  // Get endpoint from global config (exposed by EngineAdapter init)
  const endpointUrl = (typeof window !== "undefined" && window.__v5EndpointUrl)
    ? window.__v5EndpointUrl
    : "/api/orchestrator/v5/step"; // Fallback to relative URL for dev proxy

  // Update diagnostics before calling backend
  updateP1Diagnostics({
    selectedSurfaceNodeId: surfaceNodeId || "N/A",
    resolvedAstNodeId: astNodeId || "MISSING",
    primitiveId: primitive.id,
    lastHintApplyStatus: "RUNNING",
    lastHintApplySelectionPath: targetPath || "MISSING",
    lastHintApplyPreferredPrimitiveId: primitive.id,
    lastHintApplyEndpoint: endpointUrl || "N/A",
    lastHintApplyNewLatex: "N/A",
    lastHintApplyError: "N/A"
  });

  console.log(`[P1-HINT-APPLY] primitiveId: ${primitive.id}`);
  console.log(`[P1-HINT-APPLY] selectionPath: ${targetPath}`);
  console.log(`[P1-HINT-APPLY] request URL: ${endpointUrl}`);
  console.log(`[P1-HINT-APPLY] payload:`, JSON.stringify(v5Payload));

  try {
    // Use the shared V5 client for proper request handling
    const result = await runV5Step(endpointUrl, v5Payload, 8000);
    // Record backend result to diagnostics
    const _newLatex = (result && result.engineResult && typeof result.engineResult.latex === "string") ? result.engineResult.latex : "N/A";
    updateP1Diagnostics({
      lastHintApplyStatus: result ? result.status : "engine-error",
      lastHintApplyNewLatex: _newLatex,
      lastHintApplyError: (result && result.status === "engine-error" && result.rawResponse && result.rawResponse.error) ? String(result.rawResponse.error) : "N/A"
    });


    console.log(`[P1-HINT-APPLY] response status: ${result.status}`);
    console.log(`[P1-HINT-APPLY] newExpressionLatex: ${result.engineResult?.newExpressionLatex || "N/A"}`);

    if (result.status === "step-applied" && result.engineResult?.newExpressionLatex) {
      const newLatex = result.engineResult.newExpressionLatex;
      console.log(`[P1-HINT-APPLY] SUCCESS! Updating expression to: ${newLatex}`);

      // Update the expression in the viewer
      currentLatex = newLatex;
      renderFormula();
      buildAndShowMap();

      // Clear P1 selection state
      resetIntegerCycleState();
    } else if (result.status === "no-candidates") {
      console.warn(`[P1-HINT-APPLY] No candidates found for primitive ${primitive.id}. Backend may not support this primitive.`);
    } else if (result.status === "choice") {
      console.warn(`[P1-HINT-APPLY] Got 'choice' response but expected 'step-applied'. preferredPrimitiveId may not have been honored by backend.`);
    } else if (result.status === "engine-error") {
      console.error(`[P1-HINT-APPLY][ERROR] Engine error:`, result.rawResponse);
    } else {
      console.warn(`[P1-HINT-APPLY] Unexpected response status: ${result.status}`);
    }
  } catch (err) {
    console.error(`[P1-HINT-APPLY][ERROR] Exception calling backend:`, err);
  }
}

// P1: Expose integerCycleState globally for engine-adapter access
if (typeof window !== "undefined") {
  window.__p1IntegerCycleState = integerCycleState;
}

// C4: FileBus (in-browser demo)
const fileBus = new FileBus({ name: "browser-demo-bus" });

// C2: DisplayAdapter + in-browser recorder
const eventRecorder = new ClientEventRecorder();
const displayAdapter = new DisplayAdapter(
  () => currentLatex,
  () => selectionState,
  (evt) => {
    // 1) Publish into FileBus (for future EngineAdapter / Recorder)
    fileBus.publishClientEvent(evt);
    // 2) Mirror into local recorder for JSONL export
    eventRecorder.handleEvent(evt);
  }
);

// Optional: expose FileBus for debug
if (typeof window !== "undefined") {
  window.__motorFileBus = fileBus;
}

// C6: EngineAdapter + StubEngine (embedded demo)
const engineAdapter = new EngineAdapter(fileBus, {
  mode: "http",
  httpEndpoint: "http://localhost:4201/api/entry-step",
  httpTimeout: 8000,
});

engineAdapter.start();

// Expose V5 endpoint globally for P1 hint-apply to use
const V5_ENDPOINT_URL = "http://localhost:4201/api/entry-step".replace("/api/entry-step", "/api/orchestrator/v5/step");
if (typeof window !== "undefined") {
  window.__motorEngineAdapter = engineAdapter;
  window.__v5EndpointUrl = V5_ENDPOINT_URL;
}

let isDragging = false;
let dragStart = null;
let dragEnd = null;

function renderFormula() {
  /** @type {HTMLElement|null} */
  const container = document.getElementById("formula-container");
  if (!container) return null;

  container.innerHTML = "";

  if (!window.katex || !window.katex.render) {
    container.textContent = "KaTeX is not available (window.katex missing).";
    return container;
  }

  window.katex.render(currentLatex, container, {
    throwOnError: false,
    displayMode: true,
    output: "html",
  });

  return container;
}

// === Choice Popup for Integer Context Menu ===

let currentChoicePopup = null;

/**
 * Show a popup near the clicked element with available choices.
 * @param {Array<{id: string, label: string, primitiveId: string, targetNodeId: string}>} choices
 * @param {{surfaceNodeId?: string, selectionPath?: string}} clickContext
 * @param {string} latex - Current expression latex
 */
function showChoicePopup(choices, clickContext, latex) {
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
      const targetPath = choice.targetNodeId || clickContext.selectionPath || "root";
      console.log(`[ChoicePopup] Click: primitiveId=${choice.primitiveId}, targetPath=${targetPath}`);
      applyChoice(choice.primitiveId, targetPath, latex);
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
    document.addEventListener("click", closePopupOnClickOutside, { once: true, capture: true });
  }, 0);
}

function hideChoicePopup() {
  if (currentChoicePopup) {
    currentChoicePopup.remove();
    currentChoicePopup = null;
  }
}

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
 */
async function applyChoice(primitiveId, selectionPath, latex) {
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
      currentLatex = json.expressionLatex;
      renderFormula();
      buildAndShowMap();
    } else {
      console.warn("[ApplyChoice] Step not applied:", json.status);
    }
  } catch (err) {
    console.error("[ApplyChoice] Error:", err);
  }
}

function updateHoverPanel(kind, node) {
  const hoverSpan = document.getElementById("hover-info");
  const clickSpan = document.getElementById("click-info");

  if (kind === "hover") {
    if (!hoverSpan) return;
    if (!node) {
      hoverSpan.textContent = "—";
      return;
    }
    const text = node.latexFragment ? ` "${node.latexFragment}"` : "";
    hoverSpan.textContent = `${node.id} · ${node.kind}${text}`;
  } else if (kind === "click") {
    if (!clickSpan) return;
    if (!node) {
      clickSpan.textContent = "—";
      return;
    }
    const text = node.latexFragment ? ` "${node.latexFragment}"` : "";
    clickSpan.textContent = `${node.id} · ${node.kind}${text}`;
  }
}

function clearDomHighlight() {
  if (lastHoverNode && lastHoverNode.dom) {
    lastHoverNode.dom.style.outline = "";
    lastHoverNode.dom.style.backgroundColor = "";
  }
  lastHoverNode = null;
}

function highlightNode(node) {
  clearDomHighlight();
  if (!node || !node.dom) return;
  // Hover highlight (blue outline)
  node.dom.style.outline = "2px solid rgba(37,99,235,0.8)";
  node.dom.style.backgroundColor = "rgba(191,219,254,0.45)";
  lastHoverNode = node;
}

// --- Selection helpers ---

let selectionOverlayEl = null;

function ensureSelectionOverlay() {
  const shell = document.querySelector(".formula-shell");
  if (!shell) return null;

  // Create once
  if (!selectionOverlayEl) {
    selectionOverlayEl = document.createElement("div");
    selectionOverlayEl.id = "selection-overlay";
    selectionOverlayEl.style.position = "absolute";
    selectionOverlayEl.style.left = "0px";
    selectionOverlayEl.style.top = "0px";
    selectionOverlayEl.style.right = "0px";
    selectionOverlayEl.style.bottom = "0px";
    selectionOverlayEl.style.pointerEvents = "none";
    selectionOverlayEl.style.zIndex = "2"; // above formula, below drag-rect
    shell.appendChild(selectionOverlayEl);

    // Ensure drag-rect stays above overlays
    const dragRectEl = document.getElementById("drag-rect");
    if (dragRectEl) dragRectEl.style.zIndex = "3";
  }

  return selectionOverlayEl;
}

function clearSelectionVisual(map) {
  // Backward-compat: if older code painted mv-selected on DOM, strip it.
  if (map && map.atoms) {
    for (const node of map.atoms) {
      if (node.dom && node.dom.classList) {
        node.dom.classList.remove("mv-selected");
      }
    }
  }

  const overlay = ensureSelectionOverlay();
  if (!overlay) return;
  overlay.innerHTML = "";
}

function nodeTextForVisual(node) {
  const t = (node && node.latexFragment ? String(node.latexFragment) : "").trim();
  return t;
}

function shouldSkipNodeForVisual(node) {
  if (!node) return true;

  // Never draw selection visuals for FracBar: it has no ink and produces ugly "floating lines"
  if (node.kind === "FracBar") return true;

  // Skip empty-text nodes (wrappers, struts, spacing)
  const t = nodeTextForVisual(node);
  if (!t) return true;

  // Skip pure whitespace
  if (!t.replace(/\s+/g, "")) return true;

  return false;
}

function buildSelectedLeafNodes(map) {
  const selectedSet = selectionState.selectedIds;
  const selectedById = new Map();
  for (const n of (map?.atoms || [])) {
    if (selectedSet.has(n.id)) selectedById.set(n.id, n);
  }

  // Keep only "leaf-most" selected nodes to avoid nested outlines (parent + child).
  // This is VISUAL ONLY; selectionState remains unchanged.
  const memo = new Map();
  function hasSelectedDescendant(node) {
    if (!node || !node.children || node.children.length === 0) return false;
    if (memo.has(node.id)) return memo.get(node.id);

    for (const ch of node.children) {
      if (selectedSet.has(ch.id)) {
        memo.set(node.id, true);
        return true;
      }
      if (hasSelectedDescendant(ch)) {
        memo.set(node.id, true);
        return true;
      }
    }
    memo.set(node.id, false);
    return false;
  }

  const leaf = [];
  for (const node of selectedById.values()) {
    if (!hasSelectedDescendant(node)) leaf.push(node);
  }
  return leaf;
}

function clusterDigitRuns(nodes) {
  // Merge adjacent single-digit Num nodes into one rectangle (visual polish).
  const digits = [];
  const rest = [];

  for (const n of nodes) {
    const t = nodeTextForVisual(n);
    if (n.kind === "Num" && /^[0-9]$/.test(t)) digits.push(n);
    else rest.push(n);
  }

  digits.sort((a, b) => a.bbox.left - b.bbox.left);

  const merged = [];
  let cur = null;

  function midY(n) {
    return (n.bbox.top + n.bbox.bottom) / 2;
  }

  for (const n of digits) {
    if (!cur) {
      cur = {
        kind: "Num",
        text: nodeTextForVisual(n),
        bbox: { ...n.bbox }
      };
      continue;
    }

    const sameLine = Math.abs(midY(n) - ((cur.bbox.top + cur.bbox.bottom) / 2)) <= 3;
    const gap = n.bbox.left - cur.bbox.right;

    if (sameLine && gap <= 2) {
      cur.text += nodeTextForVisual(n);
      cur.bbox.right = Math.max(cur.bbox.right, n.bbox.right);
      cur.bbox.top = Math.min(cur.bbox.top, n.bbox.top);
      cur.bbox.bottom = Math.max(cur.bbox.bottom, n.bbox.bottom);
    } else {
      merged.push(cur);
      cur = {
        kind: "Num",
        text: nodeTextForVisual(n),
        bbox: { ...n.bbox }
      };
    }
  }
  if (cur) merged.push(cur);

  // Return visual items: merged digit-runs + the rest as-is
  const items = [];
  for (const m of merged) items.push({ kind: m.kind, text: m.text, bbox: m.bbox });
  for (const r of rest) items.push({ kind: r.kind, text: nodeTextForVisual(r), bbox: r.bbox });

  // Sort for stable painting left-to-right
  items.sort((a, b) => a.bbox.left - b.bbox.left);

  return items;
}

function paintSelectionRects(items) {
  const overlay = ensureSelectionOverlay();
  if (!overlay) return;
  overlay.innerHTML = "";

  for (const it of items) {
    const w = Math.max(0, it.bbox.right - it.bbox.left);
    const h = Math.max(0, it.bbox.bottom - it.bbox.top);
    if (w < 2 || h < 2) continue; // ignore tiny noise

    const r = document.createElement("div");
    r.style.position = "absolute";
    r.style.left = it.bbox.left + "px";
    r.style.top = it.bbox.top + "px";
    r.style.width = w + "px";
    r.style.height = h + "px";

    // Match old mv-selected look but without touching KaTeX DOM
    r.style.border = "2px solid rgba(16, 185, 129, 0.95)";
    r.style.boxShadow = "0 0 0 2px rgba(16, 185, 129, 0.3)";
    r.style.backgroundColor = "rgba(209, 250, 229, 0.4)";
    r.style.borderRadius = "2px";

    overlay.appendChild(r);
  }
}

function applySelectionVisual(map) {
  if (!map || !map.atoms) return;

  // Always clear first
  clearSelectionVisual(map);

  // Build visual-only leaf nodes
  const leafSelected = buildSelectedLeafNodes(map);

  // Filter out non-ink / problematic nodes (e.g., FracBar)
  const visible = leafSelected.filter((n) => !shouldSkipNodeForVisual(n));

  // Cluster digits for prettier numbers
  const items = clusterDigitRuns(visible);

  paintSelectionRects(items);
}

// Rectangle hit-test over all map atoms (for drag selection).
function hitTestRect(map, rect) {
  if (!map || !map.atoms) return [];
  const results = [];
  for (const node of map.atoms) {
    const b = node.bbox;
    if (
      !(rect.right < b.left ||
        rect.left > b.right ||
        rect.bottom < b.top ||
        rect.top > b.bottom)
    ) {
      results.push(node);
    }
  }
  return results;
}
function buildAndShowMap() {
  /** @type {HTMLElement|null} */
  const container = document.getElementById("formula-container");
  if (!container) return null;

  let map = buildSurfaceNodeMap(container);
  map = enhanceSurfaceMap(map, container);
  map = correlateOperatorsWithAST(map, currentLatex); // Correlate operators with AST
  map = correlateIntegersWithAST(map, currentLatex);  // P1: Correlate integers with AST
  const serializable = surfaceMapToSerializable(map);

  const pre = document.getElementById("surface-json");
  if (pre) {
    pre.textContent = JSON.stringify(serializable, null, 2);
  }

  current = { map, serializable };
  if (typeof window !== "undefined") {
    window.current = current;
    window.__currentSurfaceMap = map; // P1: Expose surface map for applyP1Action lookup
  }
  clearDomHighlight();
  updateHoverPanel("hover", null);
  updateHoverPanel("click", null);

  // P1: Reset integer cycle state when expression changes
  resetIntegerCycleState();

  return current;
}

document.addEventListener("DOMContentLoaded", () => {
  const btnRebuild = document.getElementById("btn-rebuild");
  const btnDownload = document.getElementById("btn-download");
  const btnDownloadEvents = document.getElementById("btn-download-events");
  const btnDownloadBus = document.getElementById("btn-download-bus");
  const container = renderFormula();
  buildAndShowMap();


  // Manual LaTeX input: load arbitrary expression into the viewer
  const manualInput = document.getElementById("manual-latex-input");
  const btnLoadLatex = document.getElementById("btn-load-latex");
  if (manualInput && btnLoadLatex) {
    btnLoadLatex.addEventListener("click", () => {
      const value = manualInput.value.trim();
      if (!value) return;
      currentLatex = value;
      renderFormula();
      buildAndShowMap();
    });
  }


  // Engine / FileBus debug panel (last ClientEvent → EngineRequest → EngineResponse)
  const elDbgClient = document.getElementById("engine-debug-client");
  const elDbgReq = document.getElementById("engine-debug-request");
  const elDbgRes = document.getElementById("engine-debug-response");
  const elDbgTsaOp = document.getElementById("tsa-debug-operator");
  const elDbgTsaStrategy = document.getElementById("tsa-debug-strategy");
  const elDbgTsaInvariant = document.getElementById("tsa-debug-invariant");
  const elDbgTsaInvariantText = document.getElementById("tsa-debug-invariant-text");
  const elDbgTsaBefore = document.getElementById("tsa-debug-before");
  const elDbgTsaAfter = document.getElementById("tsa-debug-after");
  const elDbgTsaError = document.getElementById("tsa-debug-error");
  const elDbgTsaAstSize = document.getElementById("tsa-debug-ast-size");
  const elTsaLogOutput = document.getElementById("tsa-log-output");
  const elStudentHint = document.getElementById("tsa-student-hint");

  if (elDbgClient && elDbgReq && elDbgRes) {
    const debugState = {
      lastClientEvent: null,
      lastEngineRequest: null,
      lastEngineResponse: null,
      lastTsa: null,
      tsaLog: [],
    };

    const formatClientEvent = (ev) => {
      if (!ev) return "—";
      const parts = [];
      if (ev.type) parts.push(ev.type);
      if (ev.surfaceNodeKind) parts.push(ev.surfaceNodeKind);
      if (ev.surfaceNodeId) parts.push(ev.surfaceNodeId);
      return parts.join(" · ");
    };

    const formatEngineRequest = (req) => {
      if (!req) return "—";
      const base = req.type || "?";
      const srcType = req.clientEvent && req.clientEvent.type;
      return srcType ? base + " ← " + srcType : base;
    };

    const formatEngineResponse = (res) => {
      if (!res) return "—";
      if (res.type === "error") {
        return "error " + (res.requestType || "") + " · " + (res.message || "");
      }
      const base = (res.type || "ok") + " " + (res.requestType || "");
      const highlights =
        res.result && Array.isArray(res.result.highlights)
          ? res.result.highlights.join(", ")
          : "";
      return highlights ? base + " · highlights: " + highlights : base;
    };

    const truncate = (value, max) => {
      if (value == null) return "";
      const s = String(value);
      if (s.length <= max) return s;
      return s.slice(0, max - 1) + "…";
    };

    const formatTsaOperator = (tsa) => {
      if (!tsa || !tsa.meta) return "—";
      const idx =
        typeof tsa.meta.operatorIndex === "number" && Number.isFinite(tsa.meta.operatorIndex)
          ? tsa.meta.operatorIndex
          : -1;
      const kind =
        typeof tsa.meta.operatorKind === "string" && tsa.meta.operatorKind
          ? tsa.meta.operatorKind
          : "";
      if (idx < 0 && !kind) return "—";
      return kind ? String(idx) + " · " + kind : String(idx);
    };

    const formatTsaWindowBefore = (tsa) => {
      if (!tsa) return "—";
      const win = tsa.localWindowBefore || tsa.latexBefore || "";
      if (!win) return "—";
      return truncate(win, 48);
    };

    const formatTsaWindowAfter = (tsa) => {
      if (!tsa) return "—";
      const win = tsa.localWindowAfter || tsa.latexAfter || "";
      if (!win) return "—";
      return truncate(win, 48);
    };

    const formatTsaError = (tsa) => {
      if (!tsa || !tsa.meta || !tsa.meta.error) return "—";
      const err = tsa.meta.error;
      const kind = err.kind || "Error";
      const msg = err.message || "";
      return truncate(kind + ": " + msg, 60);
    };


    const formatTsaStrategy = (tsa) => {
      if (!tsa || !tsa.meta) return "—";
      const s = typeof tsa.meta.strategy === "string" ? tsa.meta.strategy : "";
      return s || "—";
    };

    const formatTsaInvariant = (tsa) => {
      if (!tsa || !tsa.meta) return "—";
      const id = typeof tsa.meta.invariantId === "string" ? tsa.meta.invariantId : "";
      return id || "—";
    };

    const formatTsaInvariantText = (tsa) => {
      if (!tsa || !tsa.meta) return "—";
      const id = typeof tsa.meta.invariantId === "string" ? tsa.meta.invariantId : "";
      if (!id) return "—";
      switch (id) {
        case "MI1.add-rat-rat":
          return "Adding two rational numbers (Math Invariant #1).";
        case "MI1.sub-rat-rat":
          return "Subtracting two rational numbers (Math Invariant #1).";
        case "MI1.mul-rat-rat":
          return "Multiplying two rational numbers (Math Invariant #1).";
        case "MI1.div-rat-rat":
          return "Dividing two rational numbers (Math Invariant #1).";
        default:
          return id;
      }
    };

    const formatStudentHint = (tsa) => {
      if (!tsa || !tsa.meta) return "—";
      const id = typeof tsa.meta.invariantId === "string" ? tsa.meta.invariantId : "";
      if (!id) return "—";
      switch (id) {
        case "MI1.add-rat-rat":
          return "Next step: add two rational numbers (Math Invariant #1).";
        case "MI1.sub-rat-rat":
          return "Next step: subtract two rational numbers (Math Invariant #1).";
        case "MI1.mul-rat-rat":
          return "Next step: multiply two rational numbers (Math Invariant #1).";
        case "MI1.div-rat-rat":
          return "Next step: divide two rational numbers (Math Invariant #1).";
        default:
          return "Invariant step: " + id;
      }
    };

    const countAstNodesJSON = (node) => {
      if (!node || typeof node !== "object") return 0;
      switch (node.type) {
        case "rat":
          return 1;
        case "add":
        case "mul": {
          const args = Array.isArray(node.args) ? node.args : [];
          return 1 + args.reduce((sum, x) => sum + countAstNodesJSON(x), 0);
        }
        case "sub":
        case "div":
        case "pow": {
          const l = countAstNodesJSON(node.left);
          const r = countAstNodesJSON(node.right);
          return 1 + l + r;
        }
        case "sqrt":
        case "cbrt": {
          return 1 + countAstNodesJSON(node.arg);
        }
        default:
          return 1;
      }
    };

    const formatTsaAstSize = (tsa) => {
      if (!tsa) return "—";
      const before = countAstNodesJSON(tsa.astBeforeJSON);
      const after = countAstNodesJSON(tsa.astAfterJSON);
      if (!before && !after) return "—";
      if (before === after) return String(before);
      return String(before) + " → " + String(after);
    };


    const formatTsaLog = (log) => {
      if (!log || !log.length) return "—";
      const lines = log.map((entry, i) => {
        const n = String(i + 1).padStart(2, " ");
        const ts = entry.ts || "";
        const op = entry.operator || "";
        const strat = entry.strategy || "";
        const inv = entry.invariant || "";
        const win = entry.before || "";
        return n + ". " + ts + " · op=" + op + " · strat=" + strat + " · inv=" + inv + " · " + win;
      });
      return lines.join("\n");
    };

    fileBus.subscribe((msg) => {
      if (!msg) return;

      switch (msg.messageType) {
        case "ClientEvent":
          debugState.lastClientEvent = msg.payload;

          // P1: Handle integer clicks with proper double-click detection
          const ev = msg.payload;
          if (ev && ev.type === "click" && ev.surfaceNodeKind &&
            (ev.surfaceNodeKind === "Num" || ev.surfaceNodeKind === "Number" || ev.surfaceNodeKind === "Integer")) {
            const clickCount = ev.click?.clickCount || 1;
            const surfaceId = ev.surfaceNodeId;
            const astId = ev.astNodeId;
            const now = Date.now();

            // Diagnostic: Log the astNodeId from the click event
            console.log(`[P1-CLICK] Integer click event: surfaceId=${surfaceId}, astId=${astId || 'MISSING!'}, clickCount=${clickCount}`);

            // Check if this is a browser-reported double-click (e.detail >= 2)
            if (clickCount === 2) {
              // Double-click detected by browser - apply action immediately
              // Cancel any pending single-click timeout
              if (integerCycleState.pendingClickTimeout) {
                clearTimeout(integerCycleState.pendingClickTimeout);
                integerCycleState.pendingClickTimeout = null;
              }

              // Use GREEN mode (0) if no selection, or current mode if same node selected
              const modeToApply = (integerCycleState.selectedNodeId === surfaceId)
                ? integerCycleState.cycleIndex
                : 0;

              console.log(`[P1] Double-click detected (browser): nodeId=${surfaceId}, applying mode=${modeToApply}`);

              // Apply action immediately - don't let engine-adapter handle it
              // We'll create a synthetic event with the correct mode
              applyP1Action(surfaceId, astId || integerCycleState.astNodeId, modeToApply);

              // Reset state after action
              integerCycleState.lastClickTime = 0;
              integerCycleState.lastClickNodeId = null;

            } else if (clickCount === 1) {
              // Single-click: check if this is actually a double-click based on timing
              const timeSinceLastClick = now - integerCycleState.lastClickTime;
              const sameNode = integerCycleState.lastClickNodeId === surfaceId;

              if (sameNode && timeSinceLastClick < P1_DOUBLE_CLICK_THRESHOLD) {
                // This second single-click came too fast - it's a double-click!
                // Cancel any pending timeout
                if (integerCycleState.pendingClickTimeout) {
                  clearTimeout(integerCycleState.pendingClickTimeout);
                  integerCycleState.pendingClickTimeout = null;
                }

                console.log(`[P1] Double-click detected (timing): nodeId=${surfaceId}, deltaMs=${timeSinceLastClick}`);

                // Apply current mode action (should still be GREEN since we didn't cycle yet)
                (async () => {
                  try {
                    const ctx = await ensureP1IntegerContext(surfaceId, astId || integerCycleState.astNodeId);
                    await applyP1Action(surfaceId, ctx.astNodeId, integerCycleState.cycleIndex);
                  } catch (err) {
                    console.error("[P1] Double-click apply failed:", err);
                    updateP1Diagnostics({
                      lastHintApplyStatus: "engine-error",
                      lastHintApplyError: err instanceof Error ? err.message : String(err)
                    });
                  }
                })();

                // Reset timing state
                integerCycleState.lastClickTime = 0;
                integerCycleState.lastClickNodeId = null;

              } else {
                // This is a true single-click, but delay processing in case double-click follows
                // Cancel any previous pending click
                if (integerCycleState.pendingClickTimeout) {
                  clearTimeout(integerCycleState.pendingClickTimeout);
                }

                // Record this click
                integerCycleState.lastClickTime = now;
                integerCycleState.lastClickNodeId = surfaceId;

                // Delay the cycle/selection logic
                integerCycleState.pendingClickTimeout = setTimeout(() => {
                  integerCycleState.pendingClickTimeout = null;

                  // Process as true single-click
                  if (integerCycleState.selectedNodeId === surfaceId) {
                    // Same node clicked again - cycle to next mode
                    integerCycleState.cycleIndex = (integerCycleState.cycleIndex + 1) % integerCycleState.primitives.length;
                    const modeName = integerCycleState.primitives[integerCycleState.cycleIndex].label;
                    console.log(`[P1] Single-click: cycling to mode ${integerCycleState.cycleIndex} (${modeName}) for ${surfaceId}`);
                  } else {
                    // Different node - select it with mode 0 (GREEN)
                    integerCycleState.selectedNodeId = surfaceId;
                    integerCycleState.astNodeId = astId;
                    integerCycleState.cycleIndex = 0;
                    console.log(`[P1] Single-click: selected integer ${surfaceId}, astNodeId=${astId}, mode=0 (GREEN)`);
                  }
                  applyIntegerHighlight(surfaceId, integerCycleState.cycleIndex);


                  // P1: Ensure astNodeId + backend choice list (non-blocking)
                  ensureP1IntegerContext(surfaceId, astId || integerCycleState.astNodeId).catch(err => {
                    console.warn("[P1] ensureP1IntegerContext failed (single-click):", err);
                  });
                }, P1_DOUBLE_CLICK_THRESHOLD);
              }
            }
          }
          break;
        case "EngineRequest":
          debugState.lastEngineRequest = msg.payload;
          break;
        case "EngineResponse": {
          const res = msg.payload;
          debugState.lastEngineResponse = res;

          const tsa =
            res &&
              res.result &&
              res.result.meta &&
              res.result.meta.tsa
              ? res.result.meta.tsa
              : null;
          debugState.lastTsa = tsa;

          if (tsa) {
            const entry = {
              ts: new Date().toISOString(),
              operator: formatTsaOperator(tsa),
              strategy: formatTsaStrategy(tsa),
              invariant: formatTsaInvariant(tsa),
              before: tsa.localWindowBefore || tsa.latexBefore || "",
              after: tsa.localWindowAfter || tsa.latexAfter || "",
            };
            debugState.tsaLog.push(entry);
            if (debugState.tsaLog.length > 12) {
              debugState.tsaLog.shift();
            }
          }

          // Apply engine result to the viewer only for preview/apply steps.
          if (
            res &&
            res.type === "ok" &&
            res.requestType &&
            res.result &&
            typeof res.result.latex === "string"
          ) {
            const status = res.result.meta ? res.result.meta.backendStatus : null;
            const shouldApply =
              res.requestType === "applyStep" &&
              status === "step-applied";

            if (shouldApply) {
              const newLatex = res.result.latex;
              if (newLatex && typeof newLatex === "string") {
                currentLatex = newLatex;
                renderFormula();
                buildAndShowMap();
              }
            }

            // NEW: Handle choice response - show popup with available actions
            if (status === "choice" && res.result.meta && res.result.meta.choices) {
              const choices = res.result.meta.choices;
              const clickContext = res.result.meta.clickContext || {};
              console.log("[MainJS] Choice response - showing popup", choices, clickContext);
              showChoicePopup(choices, clickContext, res.result.latex);
            }
          }
          break;
        }
        default:
          return;
      }

      elDbgClient.textContent = formatClientEvent(debugState.lastClientEvent);
      elDbgReq.textContent = formatEngineRequest(debugState.lastEngineRequest);
      elDbgRes.textContent = formatEngineResponse(debugState.lastEngineResponse);

      if (elDbgTsaOp && elDbgTsaStrategy && elDbgTsaInvariant && elDbgTsaInvariantText && elDbgTsaBefore && elDbgTsaAfter && elDbgTsaError && elDbgTsaAstSize) {
        elDbgTsaOp.textContent = formatTsaOperator(debugState.lastTsa);
        elDbgTsaStrategy.textContent = formatTsaStrategy(debugState.lastTsa);
        elDbgTsaInvariant.textContent = formatTsaInvariant(debugState.lastTsa);
        elDbgTsaInvariantText.textContent = formatTsaInvariantText(debugState.lastTsa);
        elDbgTsaBefore.textContent = formatTsaWindowBefore(debugState.lastTsa);
        elDbgTsaAfter.textContent = formatTsaWindowAfter(debugState.lastTsa);
        elDbgTsaError.textContent = formatTsaError(debugState.lastTsa);
        elDbgTsaAstSize.textContent = formatTsaAstSize(debugState.lastTsa);
      }
      if (elTsaLogOutput) {
        elTsaLogOutput.textContent = formatTsaLog(debugState.tsaLog);
      }
      if (elStudentHint) {
        elStudentHint.textContent = formatStudentHint(debugState.lastTsa);
      }
    });
  }

  // Init test selector UI
  const select = document.getElementById("test-select");
  if (select) {
    select.addEventListener("change", () => {
      const idx = parseInt(select.value, 10) || 0;
      currentLatex = TESTS[Math.max(0, Math.min(TESTS.length - 1, idx))];
      renderFormula();
      buildAndShowMap();
    });
  }

  // Debounced rebuild on window resize (keeps hit-test accurate)
  let __resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(__resizeTimer);
    __resizeTimer = setTimeout(() => {
      renderFormula();
      buildAndShowMap();
    }, 120);
  });

  if (btnRebuild) {
    btnRebuild.addEventListener("click", () => {
      renderFormula();
      buildAndShowMap();

      // Init test selector UI
      const select = document.getElementById("test-select");
      if (select) {
        select.addEventListener("change", () => {
          const idx = parseInt(select.value, 10) || 0;
          currentLatex = TESTS[Math.max(0, Math.min(TESTS.length - 1, idx))];
          renderFormula();
          buildAndShowMap();
        });
      }

      // Debounced rebuild on window resize (keeps hit-test accurate)
      let __resizeTimer = null;
      window.addEventListener("resize", () => {
        clearTimeout(__resizeTimer);
        __resizeTimer = setTimeout(() => {
          renderFormula();
          buildAndShowMap();
        }, 120);
      });
    });
  }

  if (btnDownload) {
    btnDownload.addEventListener("click", () => {
      if (!current) return;
      const data = JSON.stringify(current.serializable, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "surface-map-canonical.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (btnDownloadEvents) {
    btnDownloadEvents.addEventListener("click", () => {
      eventRecorder.download();
    });
  }

  if (btnDownloadBus) {
    btnDownloadBus.addEventListener("click", () => {
      const history = fileBus.getHistory();
      if (!history || history.length === 0) {
        console.warn("[FileBus] No messages to download");
        return;
      }
      const lines = history.map((msg) => JSON.stringify(msg));
      const blob = new Blob([lines.join("\n") + "\n"], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "filebus-messages.jsonl";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const btnDownloadSnapshot = document.getElementById("btn-download-snapshot");
  if (btnDownloadSnapshot) {
    btnDownloadSnapshot.addEventListener("click", async () => {
      try {
        const res = await fetch("http://localhost:4201/debug/step-snapshot/latest");
        if (res.status === 404) {
          alert("No step snapshot available (perform a step first).");
          return;
        }
        if (!res.ok) {
          throw new Error(`Error ${res.status}`);
        }
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `step-snapshot-${json.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error(e);
        alert("Failed to download snapshot: " + e.message);
      }
    });
  }

  const btnDownloadSession = document.getElementById("btn-download-session");
  if (btnDownloadSession) {
    btnDownloadSession.addEventListener("click", async () => {
      try {
        const res = await fetch("http://localhost:4201/debug/step-snapshot/session");
        if (!res.ok) {
          throw new Error(`Error ${res.status}`);
        }
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        a.download = `session-log-${timestamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error(e);
        alert("Failed to download session log: " + e.message);
      }
    });
  }

  const btnResetSession = document.getElementById("btn-reset-session");
  if (btnResetSession) {
    btnResetSession.addEventListener("click", async () => {
      try {
        const res = await fetch("http://localhost:4201/debug/step-snapshot/reset", { method: "POST" });
        if (res.ok) {
          alert("Session log reset.");
        } else {
          alert("Failed to reset session log.");
        }
      } catch (e) {
        console.error(e);
        alert("Failed to reset session log: " + e.message);
      }
    });
  }

  if (container) {
    // Helper: find SurfaceNode by coordinates or DOM element
    // CRITICAL FIX: For synthetic nodes (created from segmented mixed content like "2*5"),
    // DOM-based lookup fails because all synthetic nodes share the same parent element.
    // We MUST use coordinate-based hit-testing to correctly identify which segment was clicked.
    function findNodeByElement(target, e) {
      if (!current || !current.map) return null;

      // Primary: Use coordinate-based hit-testing (works for synthetic nodes)
      if (e && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
        const { hitTestPoint } = window.__surfaceMapUtils || {};
        if (hitTestPoint) {
          const node = hitTestPoint(current.map, e.clientX, e.clientY, container);
          if (node) {
            console.log("[HIT-TEST] Coordinate-based hit:", node.id, node.kind, node.latexFragment);
            return node;
          }
        }
      }

      // Fallback: DOM-based lookup (for non-synthetic nodes)
      if (!current.map.byElement) return null;
      let el = target;
      while (el && el !== container && !current.map.byElement.has(el)) {
        el = el.parentElement;
      }
      const domNode = el ? current.map.byElement.get(el) : null;
      if (domNode) {
        console.log("[HIT-TEST] DOM-based fallback:", domNode.id, domNode.kind, domNode.latexFragment);
      }
      return domNode;
    }

    // PointerDown: start drag-selection (rubber band)
    container.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return; // left click only
      if (!current || !current.map) return;
      isDragging = true;
      dragStart = { x: e.clientX, y: e.clientY };
      dragEnd = { x: e.clientX, y: e.clientY };
    });

    // Hover: show the current atomic node and highlight it in KaTeX.
    container.addEventListener("pointermove", (e) => {
      if (!current || !current.map) return;
      const containerBox = container.getBoundingClientRect();

      // Update hover (always, regardless of drag)
      // CRITICAL FIX: Use coordinate-based hit-testing for hover
      const node = findNodeByElement(e.target, e);

      if (!node) {
        clearDomHighlight();
        updateHoverPanel("hover", null);
      } else {
        highlightNode(node);
        updateHoverPanel("hover", node);
      }

      // Proxy hover events into the DisplayAdapter
      displayAdapter.emitHover(node, e);

      // If dragging, update the rubber-band rectangle
      if (isDragging && dragStart) {
        dragEnd = { x: e.clientX, y: e.clientY };
        const dragRectEl = document.getElementById("drag-rect");
        if (dragRectEl) {
          const left = Math.min(dragStart.x, dragEnd.x) - containerBox.left;
          const top = Math.min(dragStart.y, dragEnd.y) - containerBox.top;
          const width = Math.abs(dragEnd.x - dragStart.x);
          const height = Math.abs(dragEnd.y - dragStart.y);
          dragRectEl.style.display = "block";
          dragRectEl.style.left = left + "px";
          dragRectEl.style.top = top + "px";
          dragRectEl.style.width = width + "px";
          dragRectEl.style.height = height + "px";
        }
      }
    });

    // Click: record the "last click" in the panel.
    container.addEventListener("pointerup", (e) => {
      if (!current || !current.map) return;
      const map = current.map;
      const containerBox = container.getBoundingClientRect();
      const dragRectEl = document.getElementById("drag-rect");

      // If there was a drag (meaningful movement), handle rectangle selection
      if (isDragging && dragStart) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        const dist2 = dx * dx + dy * dy;
        const threshold2 = 7 * 7; // movement threshold; below this treat as a normal click

        if (dist2 > threshold2) {
          const rect = {
            left: Math.min(dragStart.x, e.clientX) - containerBox.left,
            right: Math.max(dragStart.x, e.clientX) - containerBox.left,
            top: Math.min(dragStart.y, e.clientY) - containerBox.top,
            bottom: Math.max(dragStart.y, e.clientY) - containerBox.top,
          };

          const nodesInRect = hitTestRect(map, rect);

          if (nodesInRect.length > 0) {
            if (e.ctrlKey) {
              // Ctrl + drag: toggle selection for all atoms inside the rectangle
              const newSet = new Set(selectionState.selectedIds);
              for (const n of nodesInRect) {
                if (newSet.has(n.id)) newSet.delete(n.id);
                else newSet.add(n.id);
              }
              selectionState.selectedIds = newSet;
              selectionState.mode = newSet.size <= 1 ? "single" : "multi";
              selectionState.primaryId = nodesInRect[nodesInRect.length - 1].id;
            } else {
              // Regular drag: select only what falls inside
              selectionState.selectedIds = new Set(nodesInRect.map((n) => n.id));
              selectionState.mode = "rect";
              selectionState.primaryId = nodesInRect[nodesInRect.length - 1].id;
            }
            applySelectionVisual(map);
            // Notify adapter about rectangle selection
            displayAdapter.emitSelectionChanged("rect", e);
          }

          // Hide the rectangle and reset drag state
          if (dragRectEl) {
            dragRectEl.style.display = "none";
          }
          isDragging = false;
          dragStart = null;
          dragEnd = null;
          return; // do not treat this as a normal click
        }
      }

      // If we got here, there was no drag (or it was tiny) -> treat as a click
      if (dragRectEl) {
        dragRectEl.style.display = "none";
      }
      isDragging = false;
      dragStart = null;
      dragEnd = null;

      if (e.button !== 0) return; // left click only

      // CRITICAL FIX: Use coordinate-based hit-testing for clicks
      const node = findNodeByElement(e.target, e);

      // DEBUG: Log click attempt
      console.log("[DEBUG] pointerup target:", e.target, "found node:", node);
      const elDbgClient = document.getElementById("engine-debug-client");
      if (elDbgClient) {
        elDbgClient.textContent = `Click attempt: ${node ? node.id : "null"} on ${e.target.tagName}`;
      }

      if (!node) return;

      // Update selection on click
      if (e.ctrlKey) {
        // Ctrl + click: toggle selection of a single node
        const newSet = new Set(selectionState.selectedIds);
        if (newSet.has(node.id)) {
          newSet.delete(node.id);
        } else {
          newSet.add(node.id);
        }
        selectionState.selectedIds = newSet;
        selectionState.mode = newSet.size === 0 ? "none" : (newSet.size === 1 ? "single" : "multi");
        selectionState.primaryId = newSet.size ? node.id : null;
      } else {
        // Regular click: single selection
        selectionState.selectedIds = new Set([node.id]);
        selectionState.mode = "single";
        selectionState.primaryId = node.id;
      }
      applySelectionVisual(map);
      // Notify adapter about updated selection state
      displayAdapter.emitSelectionChanged("click", e);

      // Click-debug panel
      updateHoverPanel("click", node);
      console.log("[click] SurfaceNode:", {
        id: node.id,
        kind: node.kind,
        role: node.role,
        latex: node.latexFragment,
        bbox: node.bbox,
        selectionMode: selectionState.mode,
        selectionCount: selectionState.selectedIds.size,
      });
      // Normalized click event for the rest of the pipeline
      displayAdapter.emitClick(node, e);
    });

    // Reset drag rectangle on pointer cancel/leave
    container.addEventListener("pointercancel", () => {
      const dragRectEl = document.getElementById("drag-rect");
      if (dragRectEl) dragRectEl.style.display = "none";
      isDragging = false; dragStart = null; dragEnd = null;
    });
    container.addEventListener("pointerleave", () => {
      const dragRectEl = document.getElementById("drag-rect");
      if (dragRectEl) dragRectEl.style.display = "none";
      isDragging = false; dragStart = null; dragEnd = null;
    });
  }
});
