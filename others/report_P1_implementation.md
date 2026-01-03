# P1 Integer Cycle Implementation Report

## FILES TOUCHED

| File | Path | Changes |
|------|------|---------|
| **ast-parser.js** | `viewer/app/ast-parser.js` | Added `enumerateIntegers()` function for AST integer traversal |
| **surface-map.js** | `viewer/app/surface-map.js` | Added `correlateIntegersWithAST()` to assign `astNodeId` to Num nodes |
| **main.js** | `viewer/app/main.js` | Added P1 state, highlight functions, single-click handler, global exposure |
| **engine-adapter.js** | `viewer/app/engine-adapter.js` | Modified to skip integer single-clicks, inject `preferredPrimitiveId` for double-clicks |

---

## Root Causes Addressed

### 1. Missing astNodeId for Numbers
**Problem:** Surface map only assigned `astNodeId` to operators, not to numbers (Num nodes). Integer clicks had `selectionPath: null`.

**Fix:** Added `correlateIntegersWithAST()` that:
- Enumerates integers from AST in-order traversal
- Matches surface Num nodes left-to-right
- Assigns `astNodeId` to each matched surface number

### 2. No Single/Double Click Differentiation for Integers
**Problem:** Integer clicks immediately triggered backend calls with no local cycling.

**Fix:** Modified `shouldSendToEngine()` in engine-adapter.js:
- Integer single-clicks (`clickCount === 1`) are now skipped (return `false`)
- Only integer double-clicks (`clickCount === 2` or `type === "dblclick"`) go to engine

### 3. No Cycle State Management
**Problem:** No mechanism to track selected integer and current mode.

**Fix:** Added `integerCycleState` in main.js with:
- `selectedNodeId`: Currently selected integer
- `astNodeId`: AST path for targeting
- `cycleIndex`: Current mode (0 = Green/Convert to Frac, 1 = Orange/Factor Primes)
- `primitives[]`: Array of primitiveId configurations

### 4. No preferredPrimitiveId Injection
**Problem:** Backend needed `preferredPrimitiveId` to know which action to apply.

**Fix:** Modified V5 payload construction to inject `preferredPrimitiveId` from P1 state when:
- Click is on an integer node
- P1 state has a valid selected primitive

---

## P1 Behavior Summary

### Single Click on Integer
1. ClientEvent is captured by FileBus subscriber
2. P1 handler in main.js detects integer single-click
3. If same node clicked: cycle mode (0 → 1 → 0)
4. If different node: select it with mode 0
5. Apply visual highlight with mode color
6. **NO backend call** - EngineAdapter skips it

### Double Click on Integer  
1. EngineAdapter allows it through (`shouldSendToEngine` returns `true`)
2. V5 payload includes:
   - `preferredPrimitiveId` from P1 cycle state (e.g., `P.INT_TO_FRAC`)
   - `selectionPath` from P1 state's `astNodeId`
3. Backend applies primitive directly (skips choice response)
4. Expression updates in viewer

---

## Mode Configuration

| CycleIndex | Color | Primitive | Action |
|------------|-------|-----------|--------|
| 0 | Green (#4CAF50) | `P.INT_TO_FRAC` | Convert N → \frac{N}{1} |
| 1 | Orange (#FF9800) | `P.INT_FACTOR_PRIMES` | Factor to primes (not implemented - shows message) |

---

## Test Results

```
✓ tests/integer-choice.test.ts (6)
   ✓ Integer Click Context Menu (6)
     ✓ Choice Response (2)
       ✓ returns status='choice' when clicking an integer node
       ✓ returns status='choice' for integer in expression (2+3 -> click on 2)
     ✓ preferredPrimitiveId Filtering (2)
       ✓ applies P.INT_TO_FRAC when preferredPrimitiveId is provided
       ✓ returns no-candidates for invalid preferredPrimitiveId
     ✓ Non-Integer Clicks (2)
       ✓ does NOT return choice for operator clicks
       ✓ does NOT return choice for fraction clicks
✓ tests/integer-choice-e2e.test.ts (3)
   ✓ Integer Choice E2E Contract (3)
     ✓ Step 1: clicking integer returns status='choice' with choices array
     ✓ Step 2: sending preferredPrimitiveId returns status='step-applied' with result
     ✓ Full E2E: click integer in expression (2+3) -> choice -> apply -> result

Test Files  2 passed (2)
     Tests  9 passed (9)
```

---

## Deliverables

- **ZIP Patch:** `D:\G\P1_integer_cycle_patch.zip`
  - Contains modified files with correct paths relative to D:\G

---

## Manual Verification Steps

1. Start backend: `cd D:\G\backend-api-v1.http-server && npm run dev`
2. Start viewer: `cd D:\G\viewer && npm run dev`
3. Open viewer in browser
4. Load expression `2+3`
5. **Single click on "2"**: Should see green highlight and "Convert to fraction" indicator
6. **Single click again on "2"**: Should cycle to orange highlight "Factor to primes"
7. **Single click again on "2"**: Should cycle back to green
8. **Double click on "2" (while green)**: Expression should become `\frac{2}{1}+3`
9. Click operator "+" to apply: Expression becomes `5`
10. **Double click on "5" (while green)**: Expression should become `\frac{5}{1}`
