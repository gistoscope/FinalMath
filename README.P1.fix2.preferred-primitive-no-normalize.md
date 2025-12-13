# P1 Fix 2: Hint/Double-Click Apply should execute number-target primitive inside binary ops

## What this fixes
- When applying a forced primitive (e.g. Hint Apply: `P.INT_TO_FRAC`) on an integer inside an expression like `2+3`,
  V5 click-normalization was upgrading the click target from the number to the parent operator (root `+`).
- That prevented number-target primitives from matching, resulting in `no-candidates`.

## Changes
1) `PrimitiveMaster.resolvePrimitive` now accepts optional `preferredPrimitiveId`.
   - If set, we skip binary-op click normalization and keep the raw click target nodeId/kind.
2) Orchestrator passes `req.preferredPrimitiveId` into `primitiveMaster.resolvePrimitive(...)`.

## Expected behavior after this patch
- Click `2` in `2+3` -> choose hint `Convert to fraction` -> Apply:
  output becomes `\frac{2}{1}+3`
- Session Log:
  - `selectionPath` remains `term[0]`
  - `selectionAstPath` should also be `term[0]` (or a more specific number node path), not `root`.

## Install
Unzip into your project root (e.g. `D:\G`) with overwrite.
Restart backend and viewer.
