# Step 4: Component Implementation

This step involves reconstructing the legacy HTML structure (from `index.html`) within the React application (`App.tsx`). This provides the visual shell that the legacy JavaScript will interact with.

## 1. Migration Strategy

- **HTML to JSX**: Convert standard HTML tags to JSX syntax (e.g., `class` → `className`, `style` strings → objects).
- **Refs for DOM Access**: The legacy code extensively uses `document.getElementById('id')`. While standard React philosophy avoids direct DOM manipulation, our goal is _migration first_. We will keep the IDs as they are so the legacy code finds them.
  - _Note_: In a pure React refactor, we would use `useRef` and pass refs to components. For now, creating the elements with the correct `id` attributes renders them to the DOM, and `document.getElementById` will still work (albeit slightly "un-React-like").

## 2. Update `App.tsx`

We will replace the entire content of `src/App.tsx`.

### Action Items

1.  Open `react-viewer/src/App.tsx`.
2.  Replace the contents with the code below. This code replicates the structure of `viewer/index.html`.

### New `App.tsx` Code

```tsx
import { useEffect } from "react";
import "./App.css";
// Ensure global styles are imported if not done in main.tsx
import "./index.css";

function App() {
  useEffect(() => {
    // This is where we will eventually initialize the legacy logic (Step 5)
    console.log("App component mounted");
  }, []);

  return (
    <div className="page">
      <header>
        <h1>Интерактивный тренажер</h1>
        <p>Демонстрация работы SurfaceNodeMap и TSA (NGIN Lite).</p>
      </header>

      <div className="layout">
        {/* === CARD 1: DISPLAY VIEWER === */}
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

        {/* === CARD 2: TSA STEPS LOG === */}
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

        {/* === CARD 3: SURFACE NODE MAP JSON === */}
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
            <label htmlFor="manual-latex-input" style={{ marginBottom: "4px" }}>
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
          <pre id="surface-json">{`{ "status": "building surface map..." }`}</pre>
          <div className="footer-note">
            Это сериализованное дерево SurfaceNodeMap: только семантические узлы
            (числа, знаки, скобки, дробные черты и т.п.).
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
```

## 3. Verify

1.  Run `pnpm dev` (if not running).
2.  Open the browser.
3.  You should see the full UI rendered exactly as it was in the vanilla app, but inside the React shell.
4.  _Note_: The buttons won't do anything yet because we haven't wired up the logic (Step 5).
