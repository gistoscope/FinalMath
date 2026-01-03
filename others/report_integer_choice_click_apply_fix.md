# Integer Choice Click-Apply Fix Report

## Problem

Clicking an integer in the Viewer (e.g., clicking "2" in expression `2+3`) sent `EngineRequest.type = "previewStep"` instead of `"applyStep"`. This meant the backend never returned `status:"choice"` with choices.

**Root cause:** In `viewer/app/engine-adapter.js`, the `toEngineRequest()` function only marked operator clicks as `applyStep`. Integer clicks (kind=Num) fell through to `previewStep`.

## Fix

**File:** `viewer/app/engine-adapter.js`
**Function:** `toEngineRequest()` (lines 174-199)

**Change:** Added check for integer nodes:

```javascript
// NEW: Integer clicks also trigger applyStep for choice menu
const isInteger = kind === "Num" || kind === "Number" || kind === "Integer";

if (isDouble || isOperator || isInteger) {
    requestType = "applyStep";
} else {
    requestType = "previewStep";
}
```

## Test Results

**9/9 tests passed:**
- 6 unit tests for choice protocol
- 3 E2E contract tests

## Manual Verification

1. Start backend: `cd D:\G\backend-api-v1.http-server && npm run dev`
2. Start viewer: `cd D:\G\viewer && npm run dev`
3. Select expression `2+3`
4. **Click the number "2"** (not the "+" operator)
5. **Expected:** Popup appears with "Convert to fraction"
6. Click the option
7. **Expected:** Expression becomes `\frac{2}{1}+3`

## Files Changed

| File | Change |
|------|--------|
| `viewer/app/engine-adapter.js` | Added isInteger check in toEngineRequest for applyStep |
