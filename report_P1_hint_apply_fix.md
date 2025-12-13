# P1 Hint Apply Fix Report

## Bug Description
Clicking the GREEN "Convert to fraction (click to apply)" hint for an integer did NOT convert the integer to `\frac{N}{1}`. First click had no effect; second click sometimes triggered wrong root operation (e.g., `2+3` → `5`).

## Root Cause
The `applyP1Action` function in `main.js` was bypassing the existing request pipeline and using a **hardcoded URL** (`http://localhost:4201/api/orchestrator/v5/step`) that might not match the actual running backend port.

## Fix Applied

### Key Changes
1. **Imported `runV5Step`** from `client/orchestratorV5Client.js` - the existing V5 client
2. **Exposed V5 endpoint globally** as `window.__v5EndpointUrl` (derived from EngineAdapter config)
3. **Rewrote `applyP1Action`** to use `runV5Step` with the global endpoint instead of hardcoded fetch
4. **Updated logging prefix** to `[P1-HINT-APPLY]` for clear tracing

### Code Changes
```javascript
// OLD (broken):
const response = await fetch("http://localhost:4201/api/orchestrator/v5/step", {...});

// NEW (fixed):
const endpointUrl = window.__v5EndpointUrl || "/api/orchestrator/v5/step";
const result = await runV5Step(endpointUrl, v5Payload, 8000);
```

---

## FILES TOUCHED

| File | Reason |
|------|--------|
| `viewer/app/main.js` | Added `runV5Step` import; exposed `V5_ENDPOINT_URL` globally; rewrote `applyP1Action` to use client instead of hardcoded fetch |

## FILES NOT TOUCHED

- `backend-api-v1.http-server/*` — No backend changes
- `viewer/app/engine-adapter.js` — Uses same pattern, not modified
- `viewer/app/client/orchestratorV5Client.js` — Existing client, not modified

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
3. Single-click "3" → GREEN highlight + hint appears
4. Click hint "Convert to fraction (click to apply)"
5. EXPECTED: Expression becomes \frac{3}{1}
```

### Case B: Compound Expression "2+3"
```
1. Hard refresh browser
2. Enter expression: 2+3
3. Single-click "2" → GREEN highlight + hint appears
4. Click hint
5. EXPECTED: Expression becomes \frac{2}{1}+3 (NOT 5!)
```

---

## Expected Console Logs

```
[P1-HINT-APPLY] primitiveId: P.INT_TO_FRAC
[P1-HINT-APPLY] selectionPath: term[0]
[P1-HINT-APPLY] request URL: http://localhost:4201/api/orchestrator/v5/step
[P1-HINT-APPLY] payload: {"sessionId":"default-session",...}
[P1-HINT-APPLY] response status: step-applied
[P1-HINT-APPLY] newExpressionLatex: \frac{2}{1}+3
[P1-HINT-APPLY] SUCCESS! Updating expression to: \frac{2}{1}+3
```

---

## Deliverables

| Artifact | Path |
|----------|------|
| **ZIP Patch** | `D:\G\P1_hint_apply_fix.zip` |
| **Report** | `D:\G\report_P1_hint_apply_fix.md` |
