# P1 Green Double-Click to Fraction Fix Report

## Root Cause

The P1 integer double-click was not applying `P.INT_TO_FRAC` because of two issues in `engine-adapter.js`:

### Issue 1: Missing astNodeId Fallback
The original code only used `p1State.astNodeId` if the double-clicked node matched `p1State.selectedNodeId`. But if:
- User double-clicked without first single-clicking
- P1 state was stale or empty
- The selectedNodeId didn't match

Then `selectionPath` remained `null` and the backend couldn't identify the target integer.

### Issue 2: No cycleIndex Default
If user double-clicked a node they hadn't single-clicked first, the code used `p1State.cycleIndex` which could be from a *different* node. Result: wrong primitive or no action.

---

## Files Changed

| File | Change |
|------|--------|
| `viewer/app/engine-adapter.js` | Fixed P1 preferredPrimitiveId injection with fallback chain and cycleIndex default |

---

## The Fix

```javascript
// P1: Inject preferredPrimitiveId for integer double-clicks from cycle state
const isIntegerNode = (request.clientEvent.surfaceNodeKind === "Num" || ...);
if (isIntegerNode && window.__p1IntegerCycleState) {
  const p1State = window.__p1IntegerCycleState;
  const clickedSurfaceId = request.clientEvent.surfaceNodeId;
  
  // Check if this is the same node that was previously selected (single-clicked)
  const isSameNode = p1State.selectedNodeId === clickedSurfaceId;
  
  // Use P1 state's cycleIndex if same node, otherwise default to mode 0 (GREEN)
  const cycleIndex = isSameNode ? p1State.cycleIndex : 0;
  const primitive = p1State.primitives[cycleIndex];
  
  if (primitive) {
    v5Payload.preferredPrimitiveId = primitive.id;
    
    // Determine selectionPath with proper fallback chain:
    // 1) P1 state's astNodeId if same node was selected
    // 2) clientEvent.astNodeId from surface map
    // 3) Keep null and rely on backend's surfaceNodeKind detection
    let targetPath = null;
    if (isSameNode && p1State.astNodeId) {
      targetPath = p1State.astNodeId;
    } else if (request.clientEvent.astNodeId) {
      targetPath = request.clientEvent.astNodeId;
    }
    
    if (targetPath) {
      v5Payload.selectionPath = targetPath;
    }
  }
}
```

---

## Request Payload (After Fix)

```json
{
  "sessionId": "default-session",
  "expressionLatex": "2+3",
  "selectionPath": "term[0]",
  "courseId": "default",
  "userRole": "student",
  "surfaceNodeKind": "Num",
  "preferredPrimitiveId": "P.INT_TO_FRAC"
}
```

Key fields:
- **preferredPrimitiveId**: `"P.INT_TO_FRAC"` (GREEN mode)
- **selectionPath**: `"term[0]"` (from surface map's astNodeId or P1 state)
- **surfaceNodeKind**: `"Num"` (fallback for backend integer detection)

---

## Test Results

```
✓ tests/integer-choice-e2e.test.ts (3 tests)
✓ tests/integer-choice.test.ts (6 tests)
✓ tests/verify-infrastructure.test.ts (3 tests)
─────────────────────────────────────────
Total: 12 passed (12)
```

---

## Manual Verification Steps

1. `cd D:\G\backend-api-v1.http-server && npm run dev`
2. `cd D:\G\viewer && npm run dev`
3. Open viewer in browser
4. Load expression: `2+3`
5. **Single-click "2"** → GREEN highlight visible
6. **Double-click "2"** → Expression becomes `\frac{2}{1}+3` (immediately, no popup)
7. Repeat with "3"
8. After converting, selection must clear (no stuck highlight)
9. **Single-click "2" twice** → ORANGE highlight
10. **Double-click ORANGE** → No crash (likely no-candidates, pending primitive)

---

## Behavior Summary

| Action | Result |
|--------|--------|
| Single-click integer | Cycles P1 mode (GREEN → ORANGE → GREEN), shows highlight |
| Double-click integer (GREEN mode) | Sends `applyStep` with `preferredPrimitiveId=P.INT_TO_FRAC`, converts N to frac{N}{1} |
| Double-click integer (ORANGE mode) | Sends `applyStep` with `preferredPrimitiveId=P.INT_FACTOR_PRIMES`, returns no-candidates (not implemented) |
| Double-click unselected integer | Defaults to mode 0 (GREEN), applies P.INT_TO_FRAC |
