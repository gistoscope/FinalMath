/* eslint-disable @typescript-eslint/no-explicit-any */
import katex from "katex";
import "katex/dist/katex.min.css";

// Expose KaTeX globally for legacy code
if (typeof window !== "undefined") {
  (window as any).katex = katex;
}

import { useEffect } from "react";
import "./App.css";
import { DebugController, setupDebugPanel } from "./app/features/debug";
import {
  displayAdapter,
  eventRecorder,
  fileBus,
  initializeAdapters,
  setEngineResponseCallbacks,
} from "./app/features/engine";
import {
  setupButtonHandlers,
  setupContainerEvents,
  setupGlobalEvents,
} from "./app/features/events";
import {
  runP1OrderTest,
  runP1SelfTest,
  setOnHintApplySuccess,
} from "./app/features/p1";
import { buildAndShowMap, renderFormula } from "./app/features/rendering";
import { clearSelection } from "./app/features/selection";
import "./app/features/trace-hub";

declare global {
  interface Window {
    runP1SelfTest: () => void;
    runP1OrderTest: (order: number) => void;
    __v5EndpointUrl?: string; // If used
    katex: any;
  }
}
function App() {
  useEffect(() => {
    // This is where we will eventually initialize the legacy logic (Step 5)
    console.log("App component mounted");
    // 1. Initialize Adapters
    initializeAdapters();

    // 2. Expose Test Functions to Window
    window.runP1SelfTest = () => runP1SelfTest(renderFormula, buildAndShowMap);
    window.runP1OrderTest = (order: number) =>
      runP1OrderTest(order, renderFormula, buildAndShowMap);

    // 3. Define Callbacks
    const onHintApplySuccess = (newLatex: string) => {
      renderFormula();
      buildAndShowMap();
      clearSelection("latex-changed");
    };

    // 4. Register Callbacks
    setOnHintApplySuccess(onHintApplySuccess);
    setEngineResponseCallbacks(renderFormula, buildAndShowMap, clearSelection);

    // 5. Main Initialization (formerly DOMContentLoaded)
    // Initial render
    const container = renderFormula();
    buildAndShowMap();

    // Setup button handlers
    setupButtonHandlers({
      renderFormula,
      buildAndShowMap,
      eventRecorder,
      fileBus,
    });

    // Setup global events
    setupGlobalEvents(renderFormula, buildAndShowMap);

    // Setup debug panel
    setupDebugPanel(fileBus);
    DebugController.init();

    // Setup container events
    // Note: We are using document.getElementById inside renderFormula, so 'container' is the DOM element.
    if (container) {
      setupContainerEvents(container, displayAdapter);
    }

    console.info("[React] App initialized via migrated logic");
  }, []);
  return (
    <div>
      <div className="page">
        <header>
          <h1>Интерактивный тренажер</h1>
          <p>Демонстрация работы SurfaceNodeMap и TSA (NGIN Lite).</p>
        </header>

        <div className="layout">
          <section className="card">
            <h2>Display Viewer (KaTeX)</h2>
            <div className="formula-shell">
              <div id="formula-container"></div>
              <div id="drag-rect"></div>
            </div>
            <div id="hover-panel" className="hover-panel">
              <div className="hover-title">Hover / Click debug</div>
              <div className="hover-line">
                <span className="label">Hover:</span>{" "}
                <span id="hover-info">—</span>
              </div>
              <div className="hover-line">
                <span className="label">Last click:</span>
                <span id="click-info">—</span>
              </div>
            </div>
            <div className="step-hint">
              <div className="step-hint-label">Step hint:</div>
              <div id="tsa-student-hint" className="step-hint-text">
                —
              </div>
            </div>

            <div id="engine-debug-panel" className="hover-panel">
              <div className="hover-title">Engine debug (FileBus)</div>
              <div className="hover-line">
                <span className="label">ClientEvent:</span>
                <span id="engine-debug-client">—</span>
              </div>
              <div className="hover-line">
                <span className="label">EngineRequest:</span>
                <span id="engine-debug-request">—</span>
              </div>
              <div className="hover-line">
                <span className="label">EngineResponse:</span>
                <span id="engine-debug-response">—</span>
              </div>
            </div>
            <div id="tsa-debug-panel" className="hover-panel">
              <div className="hover-title">TSA debug</div>
              <div className="hover-line">
                <span className="label">Operator:</span>
                <span id="tsa-debug-operator">—</span>
              </div>
              <div className="hover-line">
                <span className="label">Strategy:</span>
                <span id="tsa-debug-strategy">—</span>
              </div>
              <div className="hover-line">
                <span className="label">Invariant:</span>
                <span id="tsa-debug-invariant">—</span>
              </div>
              <div className="hover-line">
                <span className="label">Invariant text:</span>
                <span id="tsa-debug-invariant-text">—</span>
              </div>
              <div className="hover-line">
                <span className="label">Window before:</span>
                <span id="tsa-debug-before">—</span>
              </div>
              <div className="hover-line">
                <span className="label">Window after:</span>
                <span id="tsa-debug-after">—</span>
              </div>
              <div className="hover-line">
                <span className="label">Error:</span>
                <span id="tsa-debug-error">—</span>
              </div>
              <div className="hover-line">
                <span className="label">AST nodes:</span>
                <span id="tsa-debug-ast-size">—</span>
              </div>
            </div>
            <div className="footer-note">
              Формула рендерится KaTeX, затем строится карта интерактивности по
              DOM + геометрии.
            </div>
          </section>

          <section className="card">
            <h2>TSA steps log</h2>
            <pre
              id="tsa-log-output"
              style={{
                marginTop: "8px",
                padding: "10px 12px",
                maxHeight: "360px",
                overflow: "auto",
                whiteSpace: "pre",
                background: "#0f172a",
                color: "#e5e7eb",
                borderRadius: "8px",
                fontSize: "14px",
              }}
            >
              —
            </pre>
          </section>

          <section className="card">
            <h2>Surface Node Map JSON</h2>
            <div className="controls">
              <label htmlFor="test-select" style={{ marginRight: "8px" }}>
                Test:
              </label>
              <select id="test-select">
                <option value="0">T14 · Fraction Addition Same Denom</option>
                <option value="1">T15 · Fraction Subtraction Same Denom</option>
                <option value="2">T0 · Integers 2 + 3</option>
                <option value="3">T1 · Simple fractions</option>
                <option value="4">T2 · Nested fraction</option>
                <option value="5">T3 · Unary minus + brackets</option>
                <option value="6">T4 · Decimals</option>
                <option value="7">T5 · Mixed numbers</option>
                <option value="8">T6 · 2 + 3 - 1</option>
                <option value="9">T7 · Three fractions</option>
                <option value="10">T8 · (1-1/3)·3/4</option>
                <option value="11">T9 · 2/5 - (1/10+3/20)</option>
                <option value="12">T10 · Two bracketed groups</option>
                <option value="13">T11 · Mixed decimals & fractions</option>
                <option value="14">T12 · Stress nested</option>
                <option value="15">T13 · Extra mix</option>
              </select>

              <button id="btn-rebuild" className="primary">
                Rebuild map
              </button>
              <button id="btn-download" className="secondary">
                Download JSON
              </button>
              <button id="btn-download-events" className="secondary">
                Download events JSONL
              </button>
              <button id="btn-download-bus" className="secondary">
                Download bus JSONL
              </button>
              <button id="btn-download-snapshot" className="secondary">
                Download Step Snapshot
              </button>
              <button id="btn-download-session" className="secondary">
                Download Session Log
              </button>
              <button id="btn-reset-session" className="secondary">
                Reset Session Log
              </button>
              <button
                id="btn-clear-selection"
                className="secondary"
                style={{
                  background: "#fecaca",
                  color: "#7f1d1d",
                  border: "1px solid #f87171",
                }}
              >
                Clear selection
              </button>
            </div>
            <div
              className="controls"
              style={{
                marginTop: "10px",
                flexDirection: "column",
                alignItems: "stretch",
              }}
            >
              <label
                htmlFor="manual-latex-input"
                style={{ marginBottom: "4px" }}
              >
                Manual LaTeX input:
              </label>
              <textarea
                id="manual-latex-input"
                rows={2}
                style={{
                  width: "100%",
                  resize: "vertical",
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                }}
              ></textarea>
              <div style={{ marginTop: "6px" }}>
                <button id="btn-load-latex" className="secondary">
                  Load LaTeX into viewer
                </button>
              </div>
            </div>
            <pre id="surface-json">
              {JSON.stringify({ status: "building surface map..." }, null, 2)}
            </pre>
            <div className="footer-note">
              Это сериализованное дерево SurfaceNodeMap: только семантические
              узлы (числа, знаки, скобки, дробные черты и т.п.).
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
