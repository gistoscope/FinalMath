# P1 Hint Click Apply INT_TO_FRAC Fix Report

## Root Cause (one sentence)

The `applyP1Action` function was publishing a synthetic event to FileBus which was not being processed correctly by the engine-adapter chain, and the astNodeId could be null/undefined for isolated integers, preventing the backend from finding the target node.

## What Changed

| Change | Description |
|--------|-------------|
| **Robust astNodeId fallback** | Added fallback chain: `param → integerCycleState.astNodeId → "root"` |
| **Direct HTTP call** | Bypassed FileBus/EngineAdapter chain; direct fetch to V5 endpoint |
| **Comprehensive logging** | Added `[P1-APPLY]` logs for full trace of request/response |
| **UI update on success** | Direct call to `currentLatex = newLatex; renderFormula(); buildAndShowMap()` |
| **State reset** | Call `resetIntegerCycleState()` after successful apply |

## FILES TOUCHED:
| File | Change |
|------|--------|
| `viewer/app/main.js` | Rewrote `applyP1Action` function |

## FILES NOT TOUCHED:
| File | Reason |
|------|--------|
| `viewer/app/engine-adapter.js` | Not needed - bypassed with direct HTTP |
| `viewer/app/filebus.js` | Not needed - bypassed with direct HTTP |
| `viewer/app/display-adapter.js` | Not needed - issue was in apply path |
| `viewer/app/surface-map.js` | Not needed - correlation works correctly |
| `backend-api-v1.http-server/*` | Not needed - backend handles P.INT_TO_FRAC correctly |

## How to Verify (expression `3`)

```
1. Start backend:
   cd D:\G\backend-api-v1.http-server && npm run dev

2. Start viewer:
   cd D:\G\viewer && npm run dev

3. Open viewer in browser (http://localhost:XXXX)

4. In the LaTeX input, enter: 3
   Click "Load" to set expression

5. Single-click on "3" → GREEN highlight appears
   Hint shows: "Convert to fraction (click to apply)"

6. Click the hint button

7. EXPECTED: Expression becomes \frac{3}{1}
   Console shows:
   - [P1-APPLY] === Hint/DblClick Apply Action ===
   - [P1-APPLY] SUCCESS! New expression: \frac{3}{1}

8. Repeat with expression: 12 → \frac{12}{1}
```

## Example Logs

### Request Payload
```json
{
  "sessionId": "default-session",
  "expressionLatex": "3",
  "selectionPath": "root",
  "preferredPrimitiveId": "P.INT_TO_FRAC",
  "courseId": "default",
  "userRole": "student",
  "surfaceNodeKind": "Num"
}
```

### Response Payload
```json
{
  "status": "step-applied",
  "engineResult": {
    "ok": true,
    "newExpressionLatex": "\\frac{3}{1}",
    "appliedPrimitiveId": "P.INT_TO_FRAC"
  }
}
```

### Console Trace
```
[P1] Hint clicked: applying P.INT_TO_FRAC to node num-0
[P1-APPLY] === Hint/DblClick Apply Action ===
[P1-APPLY] surfaceNodeId: num-0
[P1-APPLY] astNodeId (param): undefined
[P1-APPLY] integerCycleState.astNodeId: root
[P1-APPLY] targetPath (resolved): root
[P1-APPLY] primitive: P.INT_TO_FRAC
[P1-APPLY] currentLatex: 3
[P1-APPLY] Sending V5 payload: {...}
[P1-APPLY] Backend response: {...}
[P1-APPLY] SUCCESS! New expression: \frac{3}{1}
[P1] Reset integer cycle state
```

## Test Results

```
✓ tests/integer-choice.test.ts       (6 passed)
✓ tests/integer-choice-e2e.test.ts   (3 passed)
✓ tests/verify-infrastructure.test.ts (3 passed)
─────────────────────────────────────────────────
Total: 12 passed (12)
```

## Deliverables

| Artifact | Path |
|----------|------|
| **ZIP Patch** | `D:\G\P1_hint_click_apply_INT_TO_FRAC_fix.zip` |
| **Report** | `D:\G\report_P1_hint_click_apply_INT_TO_FRAC_fix.md` |
