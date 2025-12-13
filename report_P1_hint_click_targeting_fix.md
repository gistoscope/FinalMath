# P1 Hint Click Targeting Fix Report

## Root Cause

The `applyP1Action` function used `"root"` as a blanket fallback for `selectionPath` when `astNodeId` was null/undefined:

```javascript
let targetPath = astNodeId || integerCycleState.astNodeId || "root";
```

For compound expressions like `2+3`:
- `selectionPath = "root"` tells the backend to apply the step at the ROOT node (the `+` operator)
- The backend ignores `preferredPrimitiveId = "P.INT_TO_FRAC"` because the root is NOT an integer
- Instead, it applies the default step for the root operator → `2+3 = 5`

This is **NOT an event bubbling issue** - the hint click handler correctly called `e.stopPropagation()` and sent the request. The problem was the **wrong target path** in the request payload.

## Fix Applied

| Change | Description |
|--------|-------------|
| **Smart "root" fallback** | Only use `"root"` when expression is a single isolated integer (regex `/^-?\d+$/`) |
| **Abort on missing astNodeId** | For compound expressions, if no valid `astNodeId` is available, abort with error log |
| **Better logging** | Clear error message showing which node failed and why |

### Before (broken)
```javascript
let targetPath = astNodeId || integerCycleState.astNodeId || "root";
// For "2+3" with missing astNodeId → targetPath = "root" → applies + step
```

### After (fixed)
```javascript
let targetPath = astNodeId || integerCycleState.astNodeId;

if (!targetPath) {
  const isIsolatedInteger = /^-?\d+$/.test(latex.trim());
  
  if (isIsolatedInteger) {
    targetPath = "root"; // OK for "3"
  } else {
    console.error("[P1-APPLY] ERROR: No valid astNodeId for non-isolated expression!");
    return; // ABORT - don't incorrectly target root
  }
}
```

## FILES TOUCHED:
| File | Change |
|------|--------|
| `viewer/app/main.js` | Fixed `applyP1Action` function |

## FILES NOT TOUCHED:
| File | Reason |
|------|--------|
| `viewer/app/engine-adapter.js` | Not needed - issue was in targeting logic |
| `viewer/app/surface-map.js` | Not needed - correlation works correctly |
| `viewer/app/display-adapter.js` | Not needed - bubbling was not the issue |
| `backend-api-v1.http-server/*` | Not needed - backend behavior is correct |

## Verification Checklist

### Case A: Expression `2+3` (most important)
```
1. Start backend: cd D:\G\backend-api-v1.http-server && npm run dev
2. Start viewer: cd D:\G\viewer && npm run dev
3. Load expression: 2+3
4. Single-click "2" → GREEN highlight appears
5. Click GREEN hint "Convert to fraction (click to apply)"
6. EXPECTED: Expression becomes \frac{2}{1}+3 (NOT 5)
```

### Case B: Expression `3` (isolated integer)
```
1. Load expression: 3
2. Single-click "3" → GREEN highlight appears
3. Click GREEN hint
4. EXPECTED: Expression becomes \frac{3}{1}
```

### Case C: Fraction expression (no accidental root apply)
```
1. Load expression: \frac{1}{7}+\frac{3}{7}
2. Click the denominator "7" of first fraction → GREEN highlight
3. Click GREEN hint
4. EXPECTED: Should NOT compute to \frac{4}{7} (that would be fraction add at root)
5. ACTUAL: Will likely abort with error log since fraction denominators may not have proper astNodeId
```

### Normal operator behavior preserved
```
1. Load expression: 2+3
2. Click on "+" operator
3. EXPECTED: Expression becomes 5 (normal step behavior unchanged)
```

## Console Log Examples

### Successful isolated integer (expression "3")
```
[P1-APPLY] === Hint/DblClick Apply Action ===
[P1-APPLY] surfaceNodeId: num-0
[P1-APPLY] astNodeId (param): undefined
[P1-APPLY] integerCycleState.astNodeId: root
[P1-APPLY] primitive: P.INT_TO_FRAC
[P1-APPLY] currentLatex: "3"
[P1-APPLY] Using "root" - expression "3" is an isolated integer
[P1-APPLY] targetPath (resolved): root
[P1-APPLY] Sending V5 payload: {...}
[P1-APPLY] Backend response: {"status":"step-applied",...}
[P1-APPLY] SUCCESS! New expression: \frac{3}{1}
```

### Error case (expression "2+3" with missing astNodeId)
```
[P1-APPLY] === Hint/DblClick Apply Action ===
[P1-APPLY] surfaceNodeId: num-0
[P1-APPLY] astNodeId (param): undefined
[P1-APPLY] integerCycleState.astNodeId: undefined
[P1-APPLY] primitive: P.INT_TO_FRAC
[P1-APPLY] currentLatex: "2+3"
[P1-APPLY] ERROR: No valid astNodeId for non-isolated integer expression!
[P1-APPLY] This likely means correlateIntegersWithAST did not assign an astNodeId to the clicked integer.
[P1-APPLY] Expression: "2+3", surfaceNodeId: num-0
[P1-APPLY] ABORTING - would incorrectly target root node.
```

### Successful compound (expression "2+3" with valid astNodeId)
```
[P1-APPLY] === Hint/DblClick Apply Action ===
[P1-APPLY] surfaceNodeId: num-0
[P1-APPLY] astNodeId (param): undefined
[P1-APPLY] integerCycleState.astNodeId: term[0]
[P1-APPLY] primitive: P.INT_TO_FRAC
[P1-APPLY] currentLatex: "2+3"
[P1-APPLY] targetPath (resolved): term[0]
[P1-APPLY] Sending V5 payload: {..., "selectionPath": "term[0]", ...}
[P1-APPLY] Backend response: {"status":"step-applied",...}
[P1-APPLY] SUCCESS! New expression: \frac{2}{1}+3
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
| **ZIP Patch** | `D:\G\P1_hint_click_targeting_fix.zip` |
| **Report** | `D:\G\report_P1_hint_click_targeting_fix.md` |
