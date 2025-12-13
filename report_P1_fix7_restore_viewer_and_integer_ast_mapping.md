# P1 Fix 7 — Restore Viewer + Fix Integer AST Mapping

## What this fixes

1) **Viewer blank after previous patch**
- Root cause was a JS module compile error: duplicate `const endpointUrl` declarations inside the same scope.
- This prevented `app/main.js` from loading at all, so the viewer rendered nothing and buttons did not work.

2) **P1 diagnostics: astNodeId = MISSING on simple integers**
- KaTeX surface maps often contain nested Num nodes (e.g. `Num -> Num`).
- The integer correlation pass previously matched the *first* Num in reading order, which often was the parent, not the leaf that hit-testing returns.
- Result: clicks landed on the leaf (`num-2`) which had no `astNodeId`, so `selectionPath` became MISSING and the backend couldn't apply `P.INT_TO_FRAC`.

## Changes

### viewer/app/main.js
- Accept backend choice statuses that include `"choice"` (e.g. `"blue-choice"`), instead of requiring strict `"choice"`.

### viewer/app/surface-map.js
- Integer correlation now targets **leaf Num nodes** (the ones you actually click).
- After matching, it **propagates `astNodeId` upward** so both leaf and parent Num nodes can work.

## Expected behavior after applying
- Loading LaTeX `3` and clicking `Convert to Fraction` should produce `\frac{3}{1}` (or equivalent) instead of doing nothing.
- `P1 HINT DIAGNOSTICS` should no longer show `astNodeId: MISSING` for simple integers.

## Files in this ZIP
- viewer/app/main.js
- viewer/app/surface-map.js
- this report
