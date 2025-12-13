# P1 INT_TO_FRAC Debug Fix Report

## Root Cause Analysis

### Bug 1: "preferredPrimitiveId is not defined" Error
**Location:** `viewer/app/main.js` lines 550-554 (before fix)
**Problem:** Code referenced `preferredPrimitiveId` and `endpointUrl` variables BEFORE they were defined.
```javascript
// BROKEN CODE (before fix):
updateP1Diagnostics({
  primitiveId: preferredPrimitiveId,  // ← referenced before definition!
  lastHintApplyEndpoint: endpointUrl  // ← referenced before definition!
});
const v5Payload = { preferredPrimitiveId: primitive.id, ... };  // ← defined here
const endpointUrl = ...;  // ← defined here
```
**Fix:** Moved `v5Payload` and `endpointUrl` definitions BEFORE the updateP1Diagnostics call.

### Bug 2-4: Session Log Download Fails with "Failed to fetch"
**Location:** `viewer/app/main.js` lines 1637, 1664, 1688
**Problem:** All debug endpoint URLs used wrong port **4101** instead of **4201**.
```javascript
// BROKEN: fetch("http://localhost:4101/debug/step-snapshot/latest")
// FIXED:  fetch("http://localhost:4201/debug/step-snapshot/latest")
```

---

## Files Changed

| File | Change Summary |
|------|----------------|
| `viewer/app/main.js` | Fixed undefined variable error + 3 port issues |

---

## How to Run

### Backend
```bash
cd D:\G\backend-api-v1.http-server
pnpm start:dev
# Listens on http://localhost:4201
```

### Viewer
```bash
cd D:\G\viewer
node tiny-server.js --port 4002
# Open http://localhost:4002
```

---

## How to Verify

### Test 1: Single Integer "3"
1. Open http://localhost:4002
2. Enter LaTeX: `3`
3. Click on the number 3
4. Wait for GREEN hint "Convert to fraction (click to apply)"
5. Click the hint
6. **EXPECTED:** Expression becomes `\frac{3}{1}`
7. Check diagnostics panel (bottom-left):
   - `astNodeId: root` (correct for isolated integer)
   - `lastHintApplyStatus: step-applied`

### Test 2: Compound Expression "2+3"
1. Enter LaTeX: `2+3`
2. Click on the number 2
3. Wait for GREEN hint
4. Click the hint
5. **EXPECTED:** Expression becomes `\frac{2}{1}+3` (NOT 5!)
6. Check diagnostics panel:
   - `astNodeId: term[0]`
   - `lastHintApplyStatus: step-applied`

### Test 3: Session Log Download
1. Click "Download Session Log" button
2. **EXPECTED:** JSON file downloads (no "Failed to fetch" error)

### Test 4: Step Snapshot Download
1. Perform any step (click an operator)
2. Click "Download Step Snapshot"
3. **EXPECTED:** JSON file downloads

### Test 5: Reset Session Log
1. Click "Reset Session Log"
2. **EXPECTED:** Alert "Session log reset." appears

---

## Backend Test Results

```
✓ tests/integer-choice.test.ts       (6 passed)
✓ tests/integer-choice-e2e.test.ts   (3 passed)
✓ tests/verify-infrastructure.test.ts (3 passed)
─────────────────────────────────────────────────
Total: 12 passed (12)
```

---

## Restart Instructions

| Component | Action Required |
|-----------|-----------------|
| Backend | ✅ NOT needed (no backend changes) |
| Viewer Server | ✅ NOT needed (no server config changes) |
| Browser | ⚠️ **Hard refresh (Ctrl+Shift+R)** |

---

## Diagnostics Panel Fields

The bottom-left diagnostics panel now shows:

| Field | Description |
|-------|-------------|
| `currentLatex` | Current expression |
| `surfaceNodeId` | Clicked surface node |
| `astNodeId` | Resolved AST path (e.g., `term[0]`) |
| `primitiveId` | Selected primitive (e.g., `P.INT_TO_FRAC`) |
| `lastHintApplyStatus` | Backend response status |
| `lastHintApplyError` | Error message if any |

---

## Self-Test Function

Run from browser console:
```javascript
window.runP1SelfTest()
```
This automatically tests the P1 hint apply flow and shows PASS/FAIL in diagnostics.
