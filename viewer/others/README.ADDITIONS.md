# C1 — Additions & How to Run Tiny Server (v2)

- **Fixed:** decimals are atomic at base pass → hover/click work.
- **Fixed:** greek letters are `Var` at base pass → hover/click work.
- **Post-pass:** `MinusUnary` vs `MinusBinary`, `MixedNumber`, widened `FracBar`.
- **Stability:** resize debounce; pointercancel/leave reset.
- **Tests:** 10 canonical formulas (6 baseline + 4 heavy).
- **Docs:** added `docs/snm-architecture.md`.

## Run
1. Put KaTeX under `C1/katex/` (katex.min.css/js + fonts/).
2. From archive root: `node server/tiny-server.js --port 4001 --root .`
3. Open: `http://localhost:4001/C1/` and use the **Test** selector.