// main.js
// Демо: каноническая формула KaTeX + SurfaceNodeMap + интерактивный hover/click.

import { buildSurfaceNodeMap, surfaceMapToSerializable, enhanceSurfaceMap } from "./surface-map.js";
import { DisplayAdapter, ClientEventRecorder } from "./display-adapter.js";
import { FileBus } from "./filebus.js";
import { EngineAdapter } from "./engine-adapter.js";

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
const historyLog = []; // Math History Log

// Selection engine state
const selectionState = {
  mode: "none",           // "none" | "single" | "multi" | "rect"
  primaryId: null,
  selectedIds: new Set(),
};

// Global debug state (accessible by DisplayAdapter)
const debugState = {
  lastClientEvent: null,
  lastEngineRequest: null,
  lastEngineResponse: null,
  lastTsa: null,
  tsaLog: [],
  lastAction: null, // Temporary storage for the cause of the action
};

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

    // Capture action for history log
    if (evt.type === "click" && evt.surfaceNodeId) {
      if (typeof debugState !== "undefined") {
        debugState.lastAction = {
          targetId: evt.surfaceNodeId,
          timestamp: new Date().toISOString()
        };
      }
    }

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
  httpEndpoint: "http://localhost:4101/engine",
  httpTimeout: 8000,
});

engineAdapter.start();

// Optional: expose EngineAdapter for debug
if (typeof window !== "undefined") {
  window.__motorEngineAdapter = engineAdapter;
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

  // Sync Math Inspector
  const inspectorTextarea = document.getElementById("math-inspector-latex");
  if (inspectorTextarea) {
    inspectorTextarea.value = currentLatex;
  }

  return container;
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
  // Hover подсветка (синий контур)
  node.dom.style.outline = "2px solid rgba(37,99,235,0.8)";
  node.dom.style.backgroundColor = "rgba(191,219,254,0.45)";
  lastHoverNode = node;
}

// --- Selection helpers ---

function clearSelectionVisual(map) {
  if (!map || !map.atoms) return;
  for (const node of map.atoms) {
    if (node.dom && node.dom.classList) {
      node.dom.classList.remove("mv-selected");
    }
  }
}

function applySelectionVisual(map) {
  if (!map || !map.atoms) return;
  clearSelectionVisual(map);
  for (const node of map.atoms) {
    if (selectionState.selectedIds.has(node.id) && node.dom && node.dom.classList) {
      node.dom.classList.add("mv-selected");
    }
  }
}

// Прямоугольный hit-test по всем атомам карты (для drag-выделения).
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
  const serializable = surfaceMapToSerializable(map);

  const pre = document.getElementById("surface-json");
  if (pre) {
    pre.textContent = JSON.stringify(serializable, null, 2);
  }

  current = { map, serializable };
  if (typeof window !== "undefined") {
    window.current = current;
  }
  clearDomHighlight();
  updateHoverPanel("hover", null);
  updateHoverPanel("click", null);
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
    // debugState is now global


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
              res.requestType === "previewStep" ||
              res.requestType === "applyStep" ||
              status === "step-applied";

            if (shouldApply) {
              const newLatex = res.result.latex;
              if (newLatex && typeof newLatex === "string") {
                currentLatex = newLatex;

                // Add to History Log
                // Add to History Log
                const historyEntry = {
                  step: historyLog.length + 1,
                  timestamp: new Date().toISOString(),
                  latex: currentLatex,
                  status: status, // Replaces "trigger"
                  actionTarget: debugState.lastAction ? debugState.lastAction.targetId : null,
                  appliedRule: res.result.appliedRuleId || (res.result.meta && res.result.meta.ruleId) || null,
                  interaction: debugState.lastClientEvent ? debugState.lastClientEvent.type : null,
                  errorInfo: status === "engine-error" ? (res.error || null) : null,
                  resultingLatex: currentLatex
                };
                historyLog.push(historyEntry);

                // Clear last action after logging
                debugState.lastAction = null;

                renderFormula();
                buildAndShowMap();
              }
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

      // Render Candidate List
      const elCandidateList = document.getElementById("candidate-list");
      if (elCandidateList) {
        const candidates = debugState.lastEngineResponse?.result?.meta?.debugInfo?.allCandidates;
        if (Array.isArray(candidates) && candidates.length > 0) {
          elCandidateList.innerHTML = candidates.map((c, i) => {
            const ruleId = c.ruleId || "unknown";
            const desc = c.description || "";
            const strategy = c.strategy || "";
            return `<div style="margin-bottom: 4px; border-bottom: 1px solid #dcfce7; padding-bottom: 4px;">
              <strong>#${i + 1}</strong> [${ruleId}] <span style="color:#047857">${desc}</span> 
              <em style="color:#6b7280">(${strategy})</em>
            </div>`;
          }).join("");
        } else {
          elCandidateList.textContent = "No candidates found (or debug info missing).";
        }
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

  // Math Inspector Buttons
  const btnCopyLatex = document.getElementById("btn-copy-latex");
  if (btnCopyLatex) {
    btnCopyLatex.addEventListener("click", () => {
      const inspectorTextarea = document.getElementById("math-inspector-latex");
      if (inspectorTextarea) {
        inspectorTextarea.select();
        navigator.clipboard.writeText(inspectorTextarea.value).then(() => {
          const originalText = btnCopyLatex.textContent;
          btnCopyLatex.textContent = "Copied!";
          setTimeout(() => {
            btnCopyLatex.textContent = originalText;
          }, 2000);
        });
      }
    });
  }

  const btnDownloadHistory = document.getElementById("btn-download-history");
  if (btnDownloadHistory) {
    btnDownloadHistory.addEventListener("click", () => {
      if (historyLog.length === 0) {
        alert("History is empty. Perform some steps first.");
        return;
      }
      const data = JSON.stringify(historyLog, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "math-history.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (container) {
    // Helper: find SurfaceNode by DOM element (bubbling up)
    function findNodeByElement(target) {
      if (!current || !current.map || !current.map.byElement) return null;
      let el = target;
      while (el && el !== container && !current.map.byElement.has(el)) {
        el = el.parentElement;
      }
      return el ? current.map.byElement.get(el) : null;
    }

    // PointerDown: старт drag‑выделения (резинка)
    container.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return; // только левый клик
      if (!current || !current.map) return;
      isDragging = true;
      dragStart = { x: e.clientX, y: e.clientY };
      dragEnd = { x: e.clientX, y: e.clientY };
    });

    // Hover: показываем текущий атомарный узел и подсвечиваем его в KaTeX.
    container.addEventListener("pointermove", (e) => {
      if (!current || !current.map) return;
      const containerBox = container.getBoundingClientRect();

      // Обновляем hover (всегда, независимо от drag)
      // REFACTOR: Use DOM-based hit-testing instead of coordinate-based
      const node = findNodeByElement(e.target);

      if (!node) {
        clearDomHighlight();
        updateHoverPanel("hover", null);
      } else {
        highlightNode(node);
        updateHoverPanel("hover", node);
      }

      // Проксируем hover-событие в DisplayAdapter
      displayAdapter.emitHover(node, e);

      // Если идет drag — обновляем прямоугольник
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

    // Click: фиксируем «последний клик» в панели.
    container.addEventListener("pointerup", (e) => {
      if (!current || !current.map) return;
      const map = current.map;
      const containerBox = container.getBoundingClientRect();
      const dragRectEl = document.getElementById("drag-rect");

      // Если был drag (значимое перемещение) — обрабатываем прямоугольное выделение
      if (isDragging && dragStart) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        const dist2 = dx * dx + dy * dy;
        const threshold2 = 7 * 7; // 4px — порог, ниже считаем, что это обычный клик

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
              // Ctrl + drag: toggling для всех атомов внутри прямоугольника
              const newSet = new Set(selectionState.selectedIds);
              for (const n of nodesInRect) {
                if (newSet.has(n.id)) newSet.delete(n.id);
                else newSet.add(n.id);
              }
              selectionState.selectedIds = newSet;
              selectionState.mode = newSet.size <= 1 ? "single" : "multi";
              selectionState.primaryId = nodesInRect[nodesInRect.length - 1].id;
            } else {
              // Обычный drag: выделяем только то, что попало внутрь
              selectionState.selectedIds = new Set(nodesInRect.map((n) => n.id));
              selectionState.mode = "rect";
              selectionState.primaryId = nodesInRect[nodesInRect.length - 1].id;
            }
            applySelectionVisual(map);
            // Сообщаем адаптеру о прямоугольном выделении
            displayAdapter.emitSelectionChanged("rect", e);
          }

          // Скрываем прямоугольник и сбрасываем drag-состояние
          if (dragRectEl) {
            dragRectEl.style.display = "none";
          }
          isDragging = false;
          dragStart = null;
          dragEnd = null;
          return; // не рассматриваем это как обычный клик
        }
      }

      // Если сюда дошли — drag либо не было, либо он был очень маленький → это клик
      if (dragRectEl) {
        dragRectEl.style.display = "none";
      }
      isDragging = false;
      dragStart = null;
      dragEnd = null;

      if (e.button !== 0) return; // только левый клик

      // REFACTOR: Use DOM-based hit-testing instead of coordinate-based
      const node = findNodeByElement(e.target);

      // DEBUG: Log click attempt
      console.log("[DEBUG] pointerup target:", e.target, "found node:", node);
      const elDbgClient = document.getElementById("engine-debug-client");
      if (elDbgClient) {
        elDbgClient.textContent = `Click attempt: ${node ? node.id : "null"} on ${e.target.tagName}`;
      }

      if (!node) return;

      // Обновляем selection по клику
      if (e.ctrlKey) {
        // Ctrl + click: toggling выделения одного узла
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
        // Обычный клик: одиночное выделение
        selectionState.selectedIds = new Set([node.id]);
        selectionState.mode = "single";
        selectionState.primaryId = node.id;
      }
      applySelectionVisual(map);
      // Сообщаем адаптеру о новом состоянии выделения
      displayAdapter.emitSelectionChanged("click", e);

      // Click‑debug панель (как раньше)
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
      // Нормализованное click‑событие для последующей цепочки
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
