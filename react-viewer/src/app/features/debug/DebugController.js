// DebugController.js (formerly debug-tool.js)
import { Debugger } from "../../core/Debugger.js";
import { Logger } from "../../core/Logger.js";
import { DebugUI } from "../../ui/DebugUI.js";

// --- State ---
// Local state synced with Debugger (for view logic compatibility & helpers)
let currentAst = null;
let currentMapResult = null;
let currentStepResult = null;
let currentGlobalMapResult = null;
let currentPrimitiveMapResult = null;
let lastClickedIntegerTarget = null;

// Local UI references
let els = {};

// --- Initialization ---
export function init() {
  if (typeof document === "undefined") return;

  // --- DOM Elements ---
  els = {
    latexInput: document.getElementById("latex-input"),
    selectionType: document.getElementById("selection-type"),
    operatorIndex: document.getElementById("operator-index"),
    astPath: document.getElementById("ast-path"),
    mmMode: document.getElementById("mm-mode"),

    groupOpIndex: document.getElementById("group-op-index"),
    groupAstPath: document.getElementById("group-ast-path"),

    btnAstDebug: document.getElementById("btn-ast-debug"),

    btnMapDebug: document.getElementById("btn-map-debug"),
    btnStepDebug: document.getElementById("btn-step-debug"),
    btnGlobalMap: document.getElementById("btn-global-map"),
    btnPrimitiveMap: document.getElementById("btn-primitive-map"),

    mathPreview: document.getElementById("math-preview"),

    statusEndpoint: document.getElementById("status-endpoint"),
    statusTime: document.getElementById("status-time"),
    statusResult: document.getElementById("status-result"),
    errorMsg: document.getElementById("error-message"),
    errorText: document.getElementById("error-text"),

    astContent: document.getElementById("ast-content"),

    mapContent: document.getElementById("map-content"),
    globalMapContent: document.getElementById("global-map-content"),
    primitiveMapContent: document.getElementById("primitive-map-content"),
    stepContent: document.getElementById("step-content"),

    loading: document.getElementById("loading-overlay"),
  };

  // Event Listeners
  if (els.selectionType)
    els.selectionType.addEventListener("change", () =>
      DebugUI.updateSelectionInputs(els),
    );
  if (els.btnAstDebug)
    els.btnAstDebug.addEventListener("click", handleAstDebug);

  if (els.btnMapDebug)
    els.btnMapDebug.addEventListener("click", handleMapDebug);
  if (els.btnStepDebug)
    els.btnStepDebug.addEventListener("click", handleStepDebug);
  if (els.btnGlobalMap)
    els.btnGlobalMap.addEventListener("click", handleGlobalMapDebug);
  if (els.btnPrimitiveMap)
    els.btnPrimitiveMap.addEventListener("click", handlePrimitiveMapDebug);
  if (els.latexInput)
    els.latexInput.addEventListener("input", () => DebugUI.updatePreview(els));

  // Force Apply INT_TO_FRAC (Glass Box Debug)
  const btnForceIntToFrac = document.getElementById("btn-force-int-to-frac");
  if (btnForceIntToFrac) {
    btnForceIntToFrac.addEventListener("click", handleForceIntToFrac);
  }

  // Resolve Path (Backend Path Contract Debug)
  const btnResolvePath = document.getElementById("btn-resolve-path");
  if (btnResolvePath) {
    btnResolvePath.addEventListener("click", handleResolvePath);
  }

  // TraceHub button handlers
  const btnTraceHubDownload = document.getElementById("btn-tracehub-download");
  if (btnTraceHubDownload) {
    btnTraceHubDownload.addEventListener("click", handleTraceHubDownload);
  }
  const btnTraceHubReset = document.getElementById("btn-tracehub-reset");
  if (btnTraceHubReset) {
    btnTraceHubReset.addEventListener("click", handleTraceHubReset);
  }
  const btnTraceHubBackend = document.getElementById("btn-tracehub-backend");
  if (btnTraceHubBackend) {
    btnTraceHubBackend.addEventListener("click", handleTraceHubFetchBackend);
  }

  // P1: Add click listener on math preview for integer targeting
  if (els.mathPreview) {
    els.mathPreview.style.cursor = "pointer";
    els.mathPreview.addEventListener("click", handleMathPreviewClick);
  }

  // Initial render
  DebugUI.updateSelectionInputs(els);
  DebugUI.updatePreview(els);

  // Subscribe to state changes
  Debugger.subscribe((state) => {
    // Sync local variables
    currentAst = state.currentAst;
    currentMapResult = state.currentMapResult;
    currentStepResult = state.currentStepResult;
    currentGlobalMapResult = state.currentGlobalMapResult;
    currentPrimitiveMapResult = state.currentPrimitiveMapResult;
    lastClickedIntegerTarget = state.lastClickedIntegerTarget;

    if (state.error) {
      DebugUI.updateStatus(els, "Error", "error", state.error);
    }
    DebugUI.setLoading(els, state.loading);

    // Render updates if components exist
    if (state.currentAst) DebugUI.renderAst(els.astContent, state.currentAst);
    if (state.currentMapResult) {
      DebugUI.renderMapResult(els.mapContent, state.currentMapResult);
      DebugUI.updateStatus(els, "Map Debug", "ok");
    }
    if (state.currentStepResult) {
      DebugUI.renderStepResult(els.stepContent, state.currentStepResult);
      DebugUI.updateStatus(els, "Step Debug", "ok");
    }
    if (state.currentGlobalMapResult) {
      DebugUI.renderGlobalMapResult(
        els.globalMapContent,
        state.currentGlobalMapResult,
      );
      DebugUI.updateStatus(els, "Global Map", "ok");
    }
    if (state.currentPrimitiveMapResult) {
      DebugUI.renderPrimitiveMapResult(
        els.primitiveMapContent,
        state.currentPrimitiveMapResult,
      );
      DebugUI.updateStatus(els, "Primitive Map", "ok");
    }

    // P1 Integer Target update
    DebugUI.updateTargetInfoDisplay(state.lastClickedIntegerTarget);
  });
}

// --- Handlers ---

async function handleAstDebug() {
  const latex = els.latexInput.value;
  if (!latex.trim()) {
    alert("Please enter LaTeX");
    return;
  }
  await Debugger.fetchAstDebug(latex);
}

async function handleMapDebug() {
  const latex = els.latexInput.value;
  const selType = els.selectionType.value;
  const mode = els.mmMode.value;

  const selection = {};
  if (selType === "OperatorByIndex") {
    selection.operatorIndex = parseInt(els.operatorIndex.value, 10);
  } else {
    selection.selectionPath = els.astPath.value;
  }

  await Debugger.fetchMapDebug({ latex, selection, mode });
}

async function handleStepDebug() {
  const latex = els.latexInput.value;
  const selType = els.selectionType.value;
  const mode = els.mmMode.value;

  const selection = {};
  if (selType === "OperatorByIndex") {
    selection.operatorIndex = parseInt(els.operatorIndex.value, 10);
  } else {
    selection.selectionPath = els.astPath.value;
  }

  await Debugger.fetchStepDebug({ latex, selection, mode });
}

async function handleGlobalMapDebug() {
  const latex = els.latexInput.value;
  const request = { latex };
  await Debugger.fetchGlobalMapDebug(request);
}

async function handlePrimitiveMapDebug() {
  const latex = els.latexInput.value;
  const request = { expressionLatex: latex, stage: 1 };
  await Debugger.fetchPrimitiveMapDebug(request);
}

// --- GLASS BOX: Handle clicks on Math Preview to track integer targets ---
function handleMathPreviewClick(event) {
  // Try to find the clicked element and determine if it's a number
  const target = event.target;
  if (!target) return;

  // Get the text content of the clicked element
  const text = (target.textContent || "").trim();

  // Detect if this looks like a number (integer or decimal)
  const isNumber = /^-?[0-9]+(\.[0-9]+)?$/.test(text);

  if (isNumber) {
    // Determine kind (integer vs decimal)
    const kind = text.includes(".") ? "decimal" : "integer";

    // Try to find the corresponding AST path
    let selectionPath = null;

    if (currentAst) {
      // Find path to matching integer/number in AST
      selectionPath = findNumberPathByValue(currentAst, text);
    }

    // Store the tracked target via Debugger
    const targetObj = {
      selectionPath: selectionPath,
      surfaceNodeId: target.id || null,
      latexFragment: text,
      kind: kind,
    };
    Debugger.setLastClickedInteger(targetObj);

    // Visual feedback - green for integer, cyan for other
    const outlineColor = kind === "integer" ? "#22c55e" : "#22d3ee";
    target.style.outline = `2px solid ${outlineColor}`;
    target.style.outlineOffset = "2px";
    setTimeout(() => {
      target.style.outline = "";
      target.style.outlineOffset = "";
    }, 800);
  } else {
    // Clicked on non-number - don't clear but update display
    Logger.log("[Debug-Tool] Non-number clicked:", text);
    // Keep the last valid target but could show what was clicked
  }
}

// Helper: Find path to number with matching value in AST (supports integers)
function findNumberPathByValue(ast, value, matchedIndices = null) {
  if (!ast) return null;

  // Use a queue for BFS to find leftmost match first
  const queue = [{ node: ast, path: "root" }];
  let matchIndex = 0; // Track which occurrence of `value` we've found

  while (queue.length > 0) {
    const { node, path } = queue.shift();
    if (!node) continue;

    // Check if this is an integer node with matching value
    if (node.type === "integer" && node.value === value) {
      // If we're tracking indices, check if this is the right one
      if (matchedIndices) {
        if (matchedIndices.has(path)) {
          // Skip already-matched paths
          matchIndex++;
          continue;
        }
      }
      return path;
    }

    // Check if this is a fraction - return .num/.den virtual paths for integer children
    // Backend now supports .num/.den paths for fraction numerator/denominator
    if (node.type === "fraction") {
      // Check if numerator matches (and is a simple integer)
      if (node.numerator === value && /^-?\d+$/.test(node.numerator)) {
        const numPath = path === "root" ? "root.num" : `${path}.num`;
        console.log(
          `[Debug-Tool] Found integer ${value} in fraction numerator at ${numPath}`,
        );
        return numPath;
      }
      // Check if denominator matches (and is a simple integer)
      if (node.denominator === value && /^-?\d+$/.test(node.denominator)) {
        const denPath = path === "root" ? "root.den" : `${path}.den`;
        console.log(
          `[Debug-Tool] Found integer ${value} in fraction denominator at ${denPath}`,
        );
        return denPath;
      }
      // Non-integer fraction child - still not targetable
      if (node.numerator === value || node.denominator === value) {
        console.log(
          `[Debug-Tool] Found non-integer ${value} in fraction at ${path} - NON_TARGETABLE`,
        );
        return (
          "NON_TARGETABLE:" +
          path +
          (node.numerator === value ? ".num" : ".den") +
          ":non-integer"
        );
      }
    }

    // Traverse children for binaryOp using term[0]/term[1] format
    if (node.type === "binaryOp") {
      if (node.left) {
        const leftPath = path === "root" ? "term[0]" : `${path}.term[0]`;
        queue.push({ node: node.left, path: leftPath });
      }
      if (node.right) {
        const rightPath = path === "root" ? "term[1]" : `${path}.term[1]`;
        queue.push({ node: node.right, path: rightPath });
      }
    }
  }

  return null;
}

// --- GLASS BOX: Force Apply INT_TO_FRAC ---
async function handleForceIntToFrac() {
  const latex = els.latexInput.value;

  const glassboxPanel = document.getElementById("glassbox-panel");
  const glassboxContent = document.getElementById("glassbox-content");

  if (!glassboxPanel || !glassboxContent) return;

  // Show panel
  glassboxPanel.style.display = "block";

  // Resolve selectionPath
  let selectionPath = null;
  let targetSource = "";
  let targetKind = null;

  if (lastClickedIntegerTarget && lastClickedIntegerTarget.selectionPath) {
    selectionPath = lastClickedIntegerTarget.selectionPath;
    targetKind = lastClickedIntegerTarget.kind;
    targetSource = `clicked ${targetKind} "${lastClickedIntegerTarget.latexFragment}"`;
  } else if (els.selectionType.value === "AstPath" && els.astPath.value) {
    selectionPath = els.astPath.value;
    targetSource = "manual AST path input";
    targetKind = "unknown";
  } else if (currentAst) {
    // Try to find first integer in AST
    selectionPath = findFirstIntegerPathInAst(currentAst);
    if (selectionPath) {
      targetSource = "auto-detected first integer";
      targetKind = "integer";
    }
  }

  // Validate we have a target
  if (!selectionPath) {
    glassboxContent.innerHTML = `
<div style="color: #818cf8; font-weight: bold;">🔬 GLASS BOX: Force Apply INT_TO_FRAC</div>
<div style="margin-top: 12px; padding: 12px; background: #7f1d1d; border-radius: 4px;">
⚠️ <span style="color: #fbbf24; font-weight: bold;">No integer target selected</span>
<div style="color: #fca5a5; margin-top: 8px; font-size: 12px;">
To use Force Apply INT_TO_FRAC:
<ol style="margin: 8px 0 0 16px; padding: 0;">
<li>Click "AST Debug" to load the AST</li>
<li>Click on an integer in the rendered preview above</li>
<li>Or enter an AST path manually (e.g., "term[0]" for 2+3)</li>
</ol>
</div>
</div>`.trim();
    return;
  }

  // Validate target is integer
  if (targetKind && targetKind !== "integer" && targetKind !== "unknown") {
    glassboxContent.innerHTML = `
<div style="color: #818cf8; font-weight: bold;">🔬 GLASS BOX: Force Apply INT_TO_FRAC</div>
<div style="margin-top: 12px; padding: 12px; background: #7f1d1d; border-radius: 4px;">
⚠️ <span style="color: #fbbf24; font-weight: bold;">Target is not integer (${targetKind})</span>
<div style="color: #fca5a5; margin-top: 8px; font-size: 12px;">
INT_TO_FRAC can only be applied to integers.<br/>
Current target: <code style="color: #67e8f9;">${selectionPath}</code> (${targetKind})
</div>
</div>`.trim();
    return;
  }

  const endpoint = "/api/orchestrator/v5/step";
  const courseIdInput = document.getElementById("course-id-input");
  const courseId =
    courseIdInput && courseIdInput.value.trim()
      ? courseIdInput.value.trim()
      : "default";
  const payload = {
    sessionId: "glassbox-test",
    expressionLatex: latex,
    selectionPath: selectionPath,
    surfaceNodeKind: "Num",
    preferredPrimitiveId: "P.INT_TO_FRAC",
    userRole: "student",
    courseId: courseId,
  };

  // Show request
  DebugUI.renderGlassBoxRequest(
    glassboxContent,
    targetSource,
    endpoint,
    payload,
  );

  try {
    const json = await Debugger.forceApplyStep(payload);
    DebugUI.renderGlassBoxResponse(
      glassboxContent,
      targetSource,
      endpoint,
      payload,
      json,
    );
  } catch (err) {
    DebugUI.renderGlassBoxError(
      glassboxContent,
      targetSource,
      endpoint,
      payload,
      err,
    );
  }
}

// --- RESOLVE PATH: Call backend to resolve AST path ---
async function handleResolvePath() {
  const latex = els.latexInput.value;
  const glassboxPanel = document.getElementById("glassbox-panel");
  const glassboxContent = document.getElementById("glassbox-content");

  if (!glassboxPanel || !glassboxContent) return;

  // Show panel
  glassboxPanel.style.display = "block";

  // Get selectionPath from tracked target or manual input
  let selectionPath = null;
  let pathSource = "";

  if (lastClickedIntegerTarget && lastClickedIntegerTarget.selectionPath) {
    selectionPath = lastClickedIntegerTarget.selectionPath;
    pathSource = "clicked target";
  } else if (els.selectionType.value === "AstPath" && els.astPath.value) {
    selectionPath = els.astPath.value;
    pathSource = "manual input";
  } else {
    selectionPath = "root";
    pathSource = "default (root)";
  }

  const endpoint = "/debug/ast/resolve-path";
  const payload = { latex, selectionPath };

  DebugUI.renderResolvePathRequest(
    glassboxContent,
    pathSource,
    endpoint,
    payload,
  );

  try {
    const json = await Debugger.resolvePath(latex, selectionPath);
    DebugUI.renderResolvePathResponse(
      glassboxContent,
      pathSource,
      endpoint,
      payload,
      json,
    );
  } catch (err) {
    DebugUI.renderResolvePathError(
      glassboxContent,
      pathSource,
      endpoint,
      payload,
      err,
    );
  }
}

// Helper: Find first integer path in AST
function findFirstIntegerPathInAst(ast) {
  if (!ast) return null;

  const stack = [{ node: ast, path: "root" }];

  while (stack.length > 0) {
    const { node, path } = stack.pop();
    if (!node) continue;

    if (node.type === "integer") {
      return path;
    }

    // Traverse children
    if (node.type === "binaryOp") {
      if (node.right) {
        stack.push({
          node: node.right,
          path: path === "root" ? "term[1]" : `${path}.term[1]`,
        });
      }
      if (node.left) {
        stack.push({
          node: node.left,
          path: path === "root" ? "term[0]" : `${path}.term[0]`,
        });
      }
    }
  }

  return null;
}

// ============================================================
// TRACEHUB HANDLERS
// ============================================================

function getBackendBaseUrl() {
  // Use global if available, otherwise default to 4201
  if (typeof window !== "undefined" && window.getEngineBaseUrl) {
    return window.getEngineBaseUrl();
  }
  return "http://localhost:4201";
}

function handleTraceHubDownload() {
  console.log("[TraceHub] Download Trace JSONL clicked");
  if (window.__traceHub && window.__traceHub.downloadJsonl) {
    window.__traceHub.downloadJsonl();
    updateTraceHubUI();
  } else {
    alert("TraceHub not available - make sure main viewer is open first");
  }
}

function handleTraceHubReset() {
  console.log("[TraceHub] Reset clicked");
  if (window.__traceHub && window.__traceHub.clear) {
    window.__traceHub.clear();
    updateTraceHubUI();
  } else {
    alert("TraceHub not available");
  }
}

async function handleTraceHubFetchBackend() {
  console.log("[TraceHub] Fetch Backend Trace clicked");
  const eventsEl = document.getElementById("tracehub-events");

  try {
    const baseUrl = getBackendBaseUrl();
    const res = await fetch(`${baseUrl}/debug/trace/latest`);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();

    // Update UI
    const countEl = document.getElementById("tracehub-viewer-count");
    const traceIdEl = document.getElementById("tracehub-last-traceid");

    if (countEl) countEl.textContent = `${data.count} (backend)`;
    if (traceIdEl) traceIdEl.textContent = data.lastTraceId || "-";

    // Display events
    if (eventsEl) {
      DebugUI.renderTraceHub(eventsEl, { events: data.lastNEvents || [] });
    }

    console.log(
      `[TraceHub] Backend has ${data.count} events, lastTraceId=${data.lastTraceId}`,
    );
  } catch (err) {
    console.error("[TraceHub] Failed to fetch backend trace:", err);
    if (eventsEl) {
      eventsEl.innerHTML = `<div style="color: #f87171;">Failed to fetch: ${err.message}</div>`;
    }
  }
}

function updateTraceHubUI() {
  const countEl = document.getElementById("tracehub-viewer-count");
  const traceIdEl = document.getElementById("tracehub-last-traceid");
  const eventsEl = document.getElementById("tracehub-events");

  if (!window.__traceHub) return;

  const count = window.__traceHub.count?.() || 0;
  const summary = window.__traceHub.getLastTraceSummary?.();

  if (countEl) countEl.textContent = count.toString();
  if (traceIdEl)
    traceIdEl.textContent = summary?.traceId?.substring(0, 12) || "-";

  if (eventsEl && summary?.events) {
    DebugUI.renderTraceHub(eventsEl, { events: summary.events });
  }
}

// Hook for window globals (like switchAstView)
if (typeof window !== "undefined") {
  window.switchAstView = (view) => {
    document
      .querySelectorAll("#ast-content")
      .forEach((el) => (el.innerHTML = ""));
    document
      .querySelectorAll(".col:nth-child(2) .tab")
      .forEach((t) => t.classList.remove("active"));
    const activeTab = document.querySelector(
      `.col:nth-child(2) .tab[data-view="${view}"]`,
    );
    if (activeTab) activeTab.classList.add("active");

    const container = document.getElementById("ast-content");
    if (currentAst && container) {
      if (view === "json") {
        DebugUI.renderJson(container, currentAst);
      } else {
        DebugUI.renderAstTree(container, currentAst);
      }
    } else if (container) {
      container.innerHTML =
        '<div style="color: #9ca3af; text-align: center; margin-top: 20px;">No AST data</div>';
    }
  };

  window.switchMapView = (view) => {
    document
      .querySelectorAll("#map-content")
      .forEach((el) => (el.innerHTML = ""));
    document
      .querySelectorAll(".col:nth-child(3) .tab")
      .forEach((t) => t.classList.remove("active"));
    const activeTab = document.querySelector(
      `.col:nth-child(3) .tab[data-view="${view}"]`,
    );
    if (activeTab) activeTab.classList.add("active");

    const container = document.getElementById("map-content");
    if (currentMapResult && container) {
      if (view === "json") {
        DebugUI.renderJson(container, currentMapResult);
      } else {
        DebugUI.renderMapStructured(container, currentMapResult);
      }
    } else if (container) {
      container.innerHTML =
        '<div style="color: #9ca3af; text-align: center; margin-top: 20px;">No MapMaster data</div>';
    }
  };

  window.switchStepView = (view) => {
    document
      .querySelectorAll("#step-content")
      .forEach((el) => (el.innerHTML = ""));
    document
      .querySelectorAll(".col:nth-child(4) .tab")
      .forEach((t) => t.classList.remove("active"));
    const activeTab = document.querySelector(
      `.col:nth-child(4) .tab[data-view="${view}"]`,
    );
    if (activeTab) activeTab.classList.add("active");

    const container = document.getElementById("step-content");
    if (currentStepResult && container) {
      if (view === "json") {
        DebugUI.renderJson(container, currentStepResult);
      } else {
        DebugUI.renderStepStructured(container, currentStepResult);
      }
    } else if (container) {
      container.innerHTML =
        '<div style="color: #9ca3af; text-align: center; margin-top: 20px;">No StepMaster data</div>';
    }
  };
}
