# P1 Hint Apply INT_TO_FRAC Real Fix Report

## Bug Description
Clicking the GREEN "Convert to fraction (click to apply)" hint applied the **root operator** (e.g., `2+3` → `5`) instead of converting the clicked integer to `\frac{N}{1}`.

## Root Cause
Hint click events were **leaking into the global formula click handler** via event bubbling. Only `stopPropagation()` was used, which does NOT prevent capture-phase handlers from running.

## Fix Applied

### 1. Capture-Phase Event Blocking
```javascript
// Added to hint indicator (#p1-hint-indicator)
indicator.addEventListener("pointerdown", captureBlocker, { capture: true });
indicator.addEventListener("mousedown", captureBlocker, { capture: true });

const captureBlocker = (e) => {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  console.log(`[P1-HINT][BLOCK] Blocked ${e.type} in capture phase`);
};
```

### 2. On-Screen Diagnostics Panel (Bottom-Left)
Shows live state:
- `currentLatex`
- `surfaceNodeId`
- `astNodeId` (or `MISSING` in red)
- `primitiveId`
- `hintClickBlocked` (YES/NO)
- `lastTestResult`

### 3. Self-Test Function
Run from browser console:
```javascript
window.runP1SelfTest()
```
This automatically:
1. Loads expression `2+3`
2. Simulates selecting "2"
3. Applies P.INT_TO_FRAC
4. Checks result is `\frac{2}{1}+3`
5. Shows PASS/FAIL in diagnostics panel

---

## FILES CHANGED

| File | Changes |
|------|---------|
| `viewer/app/main.js` | Added capture-phase blockers, diagnostics panel, updateP1Diagnostics(), runP1SelfTest(), renamed indicator ID to `#p1-hint-indicator` |

## FILES NOT CHANGED

- `backend-api-v1.http-server/*` — No backend changes

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

## What to Restart/Refresh

| Component | Action |
|-----------|--------|
| **Backend** | ✅ NOT needed (no backend changes) |
| **Viewer Server** | ✅ NOT needed (no server config changes) |
| **Browser** | ⚠️ **Hard refresh required** (Ctrl+Shift+R) |

---

## Manual Verification Steps

### Case A: Isolated Integer "3"
```
1. Hard refresh browser (Ctrl+Shift+R)
2. Enter expression: 3
3. Check diagnostics panel (bottom-left) appears
4. Single-click "3" → GREEN hint appears
5. Click hint "Convert to fraction (click to apply)"
6. EXPECTED: Expression becomes \frac{3}{1}
7. Check diagnostics: astNodeId=root, hintClickBlocked=YES
```

### Case B: Compound Expression "2+3"
```
1. Hard refresh browser
2. Enter expression: 2+3
3. Single-click "2" → GREEN hint appears
4. Check diagnostics: astNodeId should show term[0] (NOT MISSING!)
5. Click hint
6. EXPECTED: Expression becomes \frac{2}{1}+3 (NOT 5!)
7. Check diagnostics: hintClickBlocked=YES
```

### Case C: Self-Test (Automated)
```
1. Open browser console (F12)
2. Run: window.runP1SelfTest()
3. Watch diagnostics panel show: lastTestResult=PASS
4. Console shows: [P1-SELF-TEST] PASS
```

---

## Console Logs to Expect

```
[P1-HINT][BLOCK] Blocked pointerdown in capture phase
[P1-HINT][BLOCK] Blocked mousedown in capture phase
[P1-HINT] Hint clicked: applying P.INT_TO_FRAC to node num-0
[P1-HINT-APPLY] primitiveId: P.INT_TO_FRAC
[P1-HINT-APPLY] selectionPath: term[0]
[P1-HINT-APPLY] response status: step-applied
[P1-HINT-APPLY] SUCCESS! Updating expression to: \frac{2}{1}+3
```

---

## Deliverables

| Artifact | Path |
|----------|------|
| **ZIP Patch** | `D:\G\P1_hint_apply_int_to_frac_REAL_fix.zip` |
| **Report** | `D:\G\report_P1_hint_apply_int_to_frac_REAL_fix.md` |
