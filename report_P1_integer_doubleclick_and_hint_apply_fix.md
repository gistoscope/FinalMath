# P1 Integer Double-Click and Hint Apply Fix Report

## Root Cause

When a user double-clicks an integer:
1. The browser fires **TWO separate click events**: first with `e.detail = 1`, then with `e.detail = 2`
2. The existing code processed the first event (`clickCount = 1`) as a single-click, immediately cycling the mode from GREEN → ORANGE
3. By the time the second event (`clickCount = 2`) reached the engine, the mode had already changed
4. Result: Intended GREEN action applied as ORANGE (or no action at all)

## Fix Summary

Implemented **delayed single-click processing** with timing-based double-click detection:

| Feature | Implementation |
|---------|----------------|
| **Delayed single-click** | Single-clicks wait 350ms before cycling mode |
| **Timing detection** | If second click arrives within 350ms on same node, cancel pending single-click and apply action |
| **Browser detection** | If browser reports `clickCount = 2`, apply action immediately |
| **Clickable hint** | Mode indicator now clickable with hover effects, applies current mode action |
| **State reset** | Clear pending timeouts on expression change |

## File Changes

### FILES TOUCHED:
| File | Change |
|------|--------|
| `viewer/app/main.js` | Complete P1 click handling rewrite |

### FILES NOT TOUCHED:
| File | Reason |
|------|--------|
| `viewer/app/engine-adapter.js` | Not needed - P1 actions now triggered via applyP1Action in main.js |
| `viewer/app/display-adapter.js` | Not needed - already provides correct clickCount |
| `viewer/app/surface-map.js` | Not needed - already provides astNodeId for numbers |
| `backend-api-v1.http-server/*` | Not needed - backend already handles P.INT_TO_FRAC correctly |

## Key Code Changes

### 1. Extended integerCycleState

```javascript
const integerCycleState = {
  // ... existing fields ...
  pendingClickTimeout: null, // Timeout ID for delayed single-click
  lastClickTime: 0,          // Timestamp of last click
  lastClickNodeId: null,     // Node ID of last click
};

const P1_DOUBLE_CLICK_THRESHOLD = 350; // milliseconds
```

### 2. Double-Click Detection Logic

```javascript
// Browser reports clickCount = 2
if (clickCount === 2) {
  clearTimeout(integerCycleState.pendingClickTimeout);
  applyP1Action(surfaceId, astId, modeToApply);
}
// OR: Timing-based detection (two fast single-clicks)
else if (sameNode && timeSinceLastClick < P1_DOUBLE_CLICK_THRESHOLD) {
  clearTimeout(integerCycleState.pendingClickTimeout);
  applyP1Action(surfaceId, astId, integerCycleState.cycleIndex);
}
// Otherwise: Delayed single-click processing
else {
  integerCycleState.pendingClickTimeout = setTimeout(() => {
    // Process as true single-click (cycle mode)
  }, P1_DOUBLE_CLICK_THRESHOLD);
}
```

### 3. Clickable Hint Indicator

```javascript
indicator.textContent = `${primitive.label} (click to apply)`;
indicator.style.cursor = "pointer";
indicator.onclick = (e) => {
  applyP1Action(surfaceNodeId, astNodeId, cycleIndex);
};
```

## Test Results

```
✓ tests/integer-choice.test.ts       (6 passed)
✓ tests/integer-choice-e2e.test.ts   (3 passed)
✓ tests/verify-infrastructure.test.ts (3 passed)
─────────────────────────────────────────────────
Total: 12 passed (12)
```

## Manual Verification Steps

1. Start backend: `cd D:\G\backend-api-v1.http-server && npm run dev`
2. Start viewer: `cd D:\G\viewer && npm run dev`
3. Open browser to viewer URL

### Test A: Double-Click Applies GREEN Action
```
1. Load expression: 2+3
2. Double-click "2" quickly
3. Expected: Expression becomes \frac{2}{1}+3
4. Console log: [P1] Double-click detected (browser): nodeId=..., applying mode=0
```

### Test B: Single-Click Cycles Mode
```
1. Load expression: 2+3
2. Single-click "2" (wait for GREEN highlight to appear)
3. Single-click "2" again (wait ~400ms between clicks)
4. Expected: Highlight changes to ORANGE
5. Console log: [P1] Single-click: cycling to mode 1 (Factor to primes)
```

### Test C: Hint Click Applies Action
```
1. Load expression: 2+3
2. Single-click "2" → GREEN highlight appears
3. Click the hint "Convert to fraction (click to apply)"
4. Expected: Expression becomes \frac{2}{1}+3
5. Console log: [P1] Hint clicked: applying P.INT_TO_FRAC to node ...
```

### Test D: Selection Clears After Action
```
1. After any successful conversion
2. Expected: Highlight and hint disappear
3. Console log: [P1] Reset integer cycle state
```

## Debug Logs to Monitor

| Log Pattern | When It Appears |
|-------------|-----------------|
| `[P1] Single-click: selected integer ...` | First click on a new integer |
| `[P1] Single-click: cycling to mode ...` | True single-click on already-selected integer |
| `[P1] Double-click detected (browser): ...` | Browser detected double-click (e.detail=2) |
| `[P1] Double-click detected (timing): ...` | Two fast clicks detected via timing |
| `[P1] Hint clicked: applying ...` | User clicked the hint indicator |
| `[P1] Applying action: primitive=...` | Action being sent to backend |
| `[P1] Reset integer cycle state` | State cleared (after action or expression change) |

## Deliverables

| Artifact | Path |
|----------|------|
| **ZIP Patch** | `D:\G\P1_integer_doubleclick_and_hint_apply_fix.zip` |
| **Report** | `D:\G\report_P1_integer_doubleclick_and_hint_apply_fix.md` |

## Example Console Excerpts

**Single-click (select integer):**
```
[P1] Single-click: selected integer num-0, astNodeId=term[0], mode=0 (GREEN)
[P1] Applied highlight to num-0 with color #4CAF50 (mode=0)
```

**Double-click (apply action):**
```
[P1] Double-click detected (browser): nodeId=num-0, applying mode=0
[P1] Applying action: primitive=P.INT_TO_FRAC, surfaceNodeId=num-0, astNodeId=term[0]
```

**Hint click:**
```
[P1] Hint clicked: applying P.INT_TO_FRAC to node num-0
[P1] Applying action: primitive=P.INT_TO_FRAC, surfaceNodeId=num-0, astNodeId=term[0]
```
