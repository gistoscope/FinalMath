P1 Fix3: Number clicks target the number (disable number->operator normalization)
Date: 2025-12-13T20:54:19.671913Z

What this fixes
- Clicking an integer inside a binary expression like `2+3` must target that integer (term[0]),
  so P.INT_TO_FRAC can be suggested/applied.
- Prevents the V5 PrimitiveMaster from silently normalizing number clicks to the parent operator (root),
  which caused only P.INT_ADD to appear and/or be applied.
- Adds engineRequest fields into Session Log / Step Snapshot (preferredPrimitiveId, selectionPath, operatorIndex, surfaceNodeKind)
  to make future debugging unambiguous.

Files replaced
- backend-api-v1.http-server/src/primitive-master/PrimitiveMaster.ts
- backend-api-v1.http-server/src/orchestrator/step.orchestrator.ts

Expected after patch
- `2+3`: click `2` -> choose "Convert to fraction" -> Apply => `\frac{2}{1}+3`
- Session Log entries include engineRequest.preferredPrimitiveId when using Hint Apply.
