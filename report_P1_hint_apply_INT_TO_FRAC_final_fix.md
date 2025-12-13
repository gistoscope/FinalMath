# P1 Hint Apply INT_TO_FRAC Fix Report

## Root Cause Analysis

**Failure Class: 1** - Viewer is NOT sending the intended request

### Issue Summary
When clicking the GREEN hint for compound expressions like `2+3`:
1. **First click did nothing** - `applyP1Action` aborted because `integerCycleState.astNodeId` was `undefined`
2. **Second click applied root operation** - User accidentally clicked on formula instead of hint

### Technical Root Cause
The stored `integerCycleState.astNodeId` was `undefined` because:
1. `ev.astNodeId` in the ClientEvent was `undefined` during single-click
2. This happened because `correlateIntegersWithAST` didn't assign `astNodeId` to the surface node (or the lookup returned a different object)
3. Without a valid `astNodeId`, `applyP1Action` correctly aborted (for compound expressions) to avoid targeting root node

### The Bug in Code
```javascript
// OLD - only 2-step fallback, aborted if no astNodeId for compound expressions
let targetPath = astNodeId || integerCycleState.astNodeId;
```

---

## Fix Applied

### Key Change: 4-Step Fallback Chain
```javascript
// NEW - 4-step robust fallback chain
let targetPath = astNodeId || integerCycleState.astNodeId;

// Step 3: Look up from current surface map using surfaceNodeId
if (!targetPath && surfaceNodeId && window.__currentSurfaceMap) {
  const map = window.__currentSurfaceMap;
  const surfaceNode = map.atoms?.find(n => n.id === surfaceNodeId);
  if (surfaceNode && surfaceNode.astNodeId) {
    targetPath = surfaceNode.astNodeId;
  }
}

// Step 4: "root" ONLY for isolated integers (e.g., "3")
```

### Exposed Surface Map Globally
```javascript
// In buildAndShowMap()
window.__currentSurfaceMap = map; // P1: Expose for applyP1Action lookup
```

---

## FILES TOUCHED

| File | Change |
|------|--------|
| `viewer/app/main.js` | Added surface map lookup fallback to `applyP1Action`; exposed `window.__currentSurfaceMap` |
| `viewer/app/surface-map.js` | No functional changes (diagnostic logging only from previous session) |

## FILES NOT TOUCHED

- `backend-api-v1.http-server/*` — Backend NOT modified

---

## What to Restart/Refresh

| Component | Action |
|-----------|--------|
| **Backend** | ✅ NOT needed (no backend changes) |
| **Viewer Server** | ✅ NOT needed (no server changes) |
| **Browser** | ⚠️ **Hard refresh required** (Ctrl+Shift+R with DevTools cache disabled) |

---

## Test Results

```
✓ tests/integer-choice.test.ts       (6 passed)
✓ tests/integer-choice-e2e.test.ts   (3 passed)
✓ tests/verify-infrastructure.test.ts (3 passed)
─────────────────────────────────────────────────
Total: 12 passed (12)
```

---

## Manual Verification Steps

### Case A: Isolated Integer "3"
```
1. Hard refresh browser
2. Enter expression: 3
3. Single-click "3" → GREEN highlight + hint
4. Click hint "Convert to fraction (click to apply)"
5. EXPECTED: Expression becomes \frac{3}{1}
```

### Case B: Compound Expression "2+3"
```
1. Hard refresh browser
2. Enter expression: 2+3
3. Single-click "2" → GREEN highlight + hint
4. Click hint "Convert to fraction (click to apply)"
5. EXPECTED: Expression becomes \frac{2}{1}+3 (NOT 5!)
```

### Case C: Fraction Denominator "\frac{4}{7}"
```
1. Hard refresh browser
2. Enter expression: \frac{4}{7}
3. Single-click "7" (denominator) → GREEN highlight + hint
4. Click hint
5. EXPECTED: Denominator becomes fraction, result like \frac{4}{\frac{7}{1}}
   (May not be fully supported depending on backend implementation)
```

---

## Expected Console Logs (Fixed Behavior)

```
[P1] Hint clicked: applying P.INT_TO_FRAC to node num-0
[P1-APPLY] === Hint/DblClick Apply Action ===
[P1-APPLY] surfaceNodeId: num-0
[P1-APPLY] astNodeId (param): undefined
[P1-APPLY] integerCycleState.astNodeId: undefined
[P1-APPLY] primitive: P.INT_TO_FRAC
[P1-APPLY] currentLatex: "2+3"
[P1-APPLY] Found astNodeId from surface map: "term[0]"
[P1-APPLY] targetPath (resolved): term[0]
[P1-APPLY] Sending V5 payload: {
  "sessionId": "default-session",
  "expressionLatex": "2+3",
  "selectionPath": "term[0]",
  "preferredPrimitiveId": "P.INT_TO_FRAC",
  ...
}
[P1-APPLY] Backend response: {"status":"step-applied",...}
[P1-APPLY] SUCCESS! New expression: \frac{2}{1}+3
```

---

## Deliverables

| Artifact | Path |
|----------|------|
| **ZIP Patch** | `D:\G\P1_hint_apply_INT_TO_FRAC_final_fix.zip` |
| **Report** | `D:\G\report_P1_hint_apply_INT_TO_FRAC_final_fix.md` |
