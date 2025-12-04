# C1 — Additions & How to Run Tiny Server

This add-on README explains **what has changed** in this update and **how to run** the demo locally.

---

## ✅ What’s new in this update

1. **Classification refinements (no API breaks)**
   - **Greek letters** (e.g., `\alpha`) are now recognized as `Var`.
   - **Decimals** (e.g., `12.5`, `0.75`) are tagged as `Decimal`.
   - **Unary vs Binary minus** — the `-` sign is heuristically labeled as `MinusUnary` or `MinusBinary` based on the nearest left neighbor on the same baseline.
   - **Mixed numbers** — an integer immediately followed by a fraction (e.g., `1\frac{2}{3}`) is labeled as `MixedNumber` (with a link to the frac bar id).
   - **No new dependencies**; this is a post‑processing pass added as `enhanceSurfaceMap(map, containerEl)` inside `app/surface-map.js`.

2. **UX improvements**
   - **FracBar hit‑zone widened** by ±3 px vertically → easier to select the fraction bar.
   - **Debounced rebuild on window resize** → hit-tests stay correct after resizes / zooms.
   - **Pointer lifecycle**: `pointercancel` / `pointerleave` now cleanly reset the drag rectangle.
   - **Drag threshold** increased (from 4 px to 7 px) to avoid accidental box‑selects.

3. **Six test formulas (selector at the top)**
   - T1: `\frac{1}{3}+\frac{2}{5}` — simple fractions
   - T2: `\frac{1}{1+\frac{1}{2}}` — nested fraction
   - T3: `-\left(\frac{3}{4}-\frac{1}{8}\right)` — unary minus + brackets
   - T4: `12.5 + 0.75 - 3.125` — decimals
   - T5: `1\frac{2}{3} + 2\frac{1}{5}` — mixed numbers
   - T6: `\alpha - \frac{7}{9} + \left(\frac{2}{5}+\frac{1}{10}\right)` — greek + unary minus

> The original technical document `docs/surface-node-map.tech.md` is left **unchanged**.

---

## ▶️ How to run locally (with Tiny Server)

1. **Put KaTeX assets** under `C1/katex/` (you said you have them locally). You should see files like:
   - `C1/katex/katex.min.css`
   - `C1/katex/katex.min.js`
   - plus font files under `C1/katex/fonts/`

2. **Start the tiny server** from the archive root:
   ```bash
   node server/tiny-server.js --port 4001 --root .
   ```

3. **Open the demo**:
   - Go to: `http://localhost:4001/C1/`
   - Use the **Test** selector to switch between 6 canonical formulas.
   - Click/Hover the expression to see semantic atoms and the serialized map.

> If you prefer another port or directory, change `--port` / `--root` accordingly.

---

## 🔧 Technical notes: why these changes

- We intentionally **did not** alter the original tree‑building algorithm to keep the package stable. All refinements are applied in a **non‑destructive post‑pass** (`enhanceSurfaceMap`) so that:
  - The base map remains compatible with current adapters.
  - New kinds (`Decimal`, `MinusUnary`, `MinusBinary`, `MixedNumber`) and widened `FracBar` are **additive**; existing tools continue to work.

- **Unary vs Binary minus** is decided by a simple left‑neighbor heuristic with vertical overlap. This is robust for typical textbook expressions and doesn’t rely on KaTeX internals.

- **Mixed numbers** are detected when an integer is immediately followed (horizontally, small gap) by a fraction bar on the same baseline. We mark the integer as `MixedNumber` and keep a reference to the bar id for downstream logic; we do not restructure the tree.

If you want, I can later expand the ruleset to cover localized decimal separators, thin spaces in thousands, and more edge cases — without changing APIs.