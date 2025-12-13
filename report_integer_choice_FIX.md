# Integer Choice FIX Report

## Root Causes Found

### Problem 1: Popup not appearing for "2" in "2+3"
**File:** `viewer/app/engine-adapter.js`
**Issue:** When clicking on an integer node in a binary expression, `astNodeId` was not set (surface map only correlates operators, not numbers). So `selectionPath: null` was sent to backend. Backend defaulted to "root" which is a binaryOp, not an integer - so no choice response.

**Fix:** 
1. Added `surfaceNodeKind` to the V5 request payload
2. Backend now detects integer clicks via `surfaceNodeKind` ("Num"/"Number"/"Integer") even when `selectionPath` doesn't resolve to an integer

### Problem 2: Clicking choice closes popup but does nothing
**File:** `viewer/app/main.js`
**Issue:** `showChoicePopup` was using `clickContext.selectionPath` which was null. It needed to use `choice.targetNodeId` (returned by backend in the choice).

**Fix:** Changed button click handler to use `choice.targetNodeId`:
```javascript
const targetPath = choice.targetNodeId || clickContext.selectionPath || "root";
```

## Files Changed

### Backend
| File | Change |
|------|--------|
| `src/orchestrator/step.orchestrator.ts` | Added `surfaceNodeKind` to interface, enhanced integer detection, added `findFirstIntegerPath` helper |
| `src/server/HandlerPostOrchestratorStepV5.ts` | Parse `surfaceNodeKind` from request |

### Viewer  
| File | Change |
|------|--------|
| `app/engine-adapter.js` | Send `surfaceNodeKind` in V5 payload |
| `app/main.js` | Use `choice.targetNodeId` in popup button handler |

## Test Results
**9/9 tests passed:**
- 6 unit tests for choice protocol
- 3 E2E contract tests

## Manual Verification

1. Start backend:
   ```bash
   cd D:\G\backend-api-v1.http-server && npm run dev
   ```

2. Start viewer:
   ```bash
   cd D:\G\viewer && npm run dev
   ```

3. Open browser to viewer

4. Select expression `2+3`

5. **Click on "2"** (not the "+" operator)
   - **Expected:** Popup appears with "Convert to fraction"
   - Console should show: `[Orchestrator] Integer click detected: byAst=false, bySurface=true`

6. Click "Convert to fraction" in popup
   - **Expected:** Expression becomes `\frac{2}{1}+3`
   - Console should show: `[ChoicePopup] Click: primitiveId=P.INT_TO_FRAC, targetPath=root.left`

7. For standalone integer (e.g., after computing 2+3=5):
   - Click on "5"
   - **Expected:** Popup appears
   - Click "Convert to fraction"
   - **Expected:** Expression becomes `\frac{5}{1}`
