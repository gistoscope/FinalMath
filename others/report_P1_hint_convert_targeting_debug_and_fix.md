# P1 Hint Convert Targeting Debug and Fix Report

## Phase A: Diagnosis

### 1. Code Path When Clicking Hint

```
Hint Click → indicator.onclick (main.js:157)
  → applyP1Action(surfaceNodeId, integerCycleState.astNodeId, cycleIndex)
    → Builds V5 payload with:
        selectionPath = astNodeId || integerCycleState.astNodeId || "root"
        preferredPrimitiveId = primitive.id (e.g., "P.INT_TO_FRAC")
    → Direct fetch to http://localhost:4201/api/orchestrator/v5/step
```

### 2. Where astNodeId Comes From

**Chain:**
1. `correlateIntegersWithAST(map, latex)` runs during `buildAndShowMap()`
2. Sets `surfaceNode.astNodeId = astInt.nodeId` for each matched integer
3. `hitTestPoint(map, x, y, container)` returns clicked surface node (with astNodeId)
4. `displayAdapter.emitClick(node, e)` creates ClientEvent with `astNodeId = node.astNodeId`
5. P1 handler stores: `integerCycleState.astNodeId = ev.astNodeId`
6. Hint click passes `integerCycleState.astNodeId` to `applyP1Action()`

### 3. Failure Modes Identified

**Possible issues (now logged for diagnosis):**

| Failure Point | Log Prefix | What to Check |
|---------------|------------|---------------|
| AST parser doesn't find integers | `[AST-NUMS]` | Check if AST integers count > 0 |
| Surface numbers not detected | `[SURFACE-NUMS]` | Check if surface nums count > 0 |
| Correlation mismatch (order differs) | `[SURFACE-NUMS] MATCHED` | Check if values match |
| hitTestPoint returns node without astNodeId | `[HIT-TEST-NUM]` | Check if astNodeId="MISSING!" |
| ClientEvent.astNodeId not set | `[P1-CLICK]` | Check if astId="MISSING!" |
| P1 state lost | `[P1-APPLY]` | Check integerCycleState.astNodeId |

### 4. Root Cause Hypothesis

For compound expressions like `2+3`:
- The correlation SHOULD work (AST: `[{nodeId:"term[0]",value:2},{nodeId:"term[1]",value:3}]`)
- If `ev.astNodeId` is `undefined` when clicking "2", it means **the clicked surface node wasn't in the correlated list**
- This can happen if:
  - KaTeX renders multi-digit numbers as separate `<span>` elements
  - Surface map creates multiple Num nodes per integer
  - Order mismatch between AST traversal and surface left-to-right sort

---

## Phase B: Diagnostic Logging Added

### Files Modified

| File | Changes |
|------|---------|
| `viewer/app/surface-map.js` | Enhanced `correlateIntegersWithAST` with detailed dumps; `hitTestPoint` logs Num nodes with astNodeId status |
| `viewer/app/main.js` | Added `[P1-CLICK]` log showing surfaceId and astId from ClientEvent |

### New Console Log Prefixes

```
[SURFACE-NUMS] Expression: "2+3"
[SURFACE-NUMS] AST integers: 2, Surface nums: 2
[AST-NUMS] All AST integers:
  [AST-NUMS] [0] nodeId="term[0]" value=2
  [AST-NUMS] [1] nodeId="term[1]" value=3
[SURFACE-NUMS] All surface numbers:
  [SURFACE-NUMS] [0] surfaceId="num-0" text="2" kind=Num bbox=(10,20)
  [SURFACE-NUMS] [1] surfaceId="num-1" text="3" kind=Num bbox=(50,20)
[SURFACE-NUMS] MATCHED: surface[0] "2" (id=num-0) -> AST nodeId="term[0]" value=2
[SURFACE-NUMS] MATCHED: surface[1] "3" (id=num-1) -> AST nodeId="term[1]" value=3

[HIT-TEST-NUM] Hit Num node: id="num-0" text="2" astNodeId="term[0]" value=2

[P1-CLICK] Integer click event: surfaceId=num-0, astId=term[0], clickCount=1

[P1] Single-click: selected integer num-0, astNodeId=term[0], mode=0 (GREEN)

[P1-APPLY] === Hint/DblClick Apply Action ===
[P1-APPLY] surfaceNodeId: num-0
[P1-APPLY] astNodeId (param): undefined
[P1-APPLY] integerCycleState.astNodeId: term[0]
[P1-APPLY] targetPath (resolved): term[0]
```

---

## Test Results

```
npx vitest run tests/integer-choice.test.ts tests/integer-choice-e2e.test.ts tests/verify-infrastructure.test.ts

 ✓ tests/integer-choice.test.ts (6)
 ✓ tests/integer-choice-e2e.test.ts (3)
 ✓ tests/verify-infrastructure.test.ts (3)
 
 Test Files  3 passed (3)
      Tests  12 passed (12)
```

---

## Manual Verification Steps

### Case A: Expression "3" (isolated integer)

```
1. Load expression: 3
2. Single-click "3" → observe console:
   - [SURFACE-NUMS] AST integers: 1, Surface nums: 1
   - [SURFACE-NUMS] MATCHED: surface[0] "3" -> AST nodeId="root"
   - [HIT-TEST-NUM] astNodeId="root"
   - [P1-CLICK] astId=root
3. Click GREEN hint → observe:
   - [P1-APPLY] targetPath (resolved): root
4. EXPECTED: Expression becomes \frac{3}{1}
```

### Case B: Expression "2+3" (compound)

```
1. Load expression: 2+3
2. Single-click "2" → observe console:
   - [SURFACE-NUMS] AST integers: 2, Surface nums: 2
   - [SURFACE-NUMS] MATCHED: surface[0] "2" -> AST nodeId="term[0]"
   - [HIT-TEST-NUM] astNodeId="term[0]"
   - [P1-CLICK] astId=term[0]
3. Click GREEN hint → observe:
   - [P1-APPLY] targetPath (resolved): term[0]
4. EXPECTED: Expression becomes \frac{2}{1}+3 (NOT 5)
```

### Case C: Expression "\frac{4}{7}" (fraction)

```
1. Load expression: \frac{4}{7}
2. Single-click "7" (denominator) → observe console:
   - [SURFACE-NUMS] AST integers: 2, Surface nums: 2
   - [SURFACE-NUMS] MATCHED: surface[1] "7" -> AST nodeId="root.den"
   - [HIT-TEST-NUM] astNodeId="root.den"
   - [P1-CLICK] astId=root.den
3. Click GREEN hint → observe:
   - [P1-APPLY] targetPath (resolved): root.den
4. EXPECTED: Denominator becomes \frac{7}{1}
```

---

## What to Restart After Changes

| Change Location | Action Required |
|-----------------|-----------------|
| `viewer/app/main.js` | Browser hard refresh (F5 or Ctrl+Shift+R) |
| `viewer/app/surface-map.js` | Browser hard refresh |
| Backend files | NOT CHANGED - no restart needed |

---

## FILES TOUCHED

| File | Change |
|------|--------|
| `viewer/app/main.js` | Added `[P1-CLICK]` diagnostic log |
| `viewer/app/surface-map.js` | Enhanced correlation logging; hitTestPoint Num node logging |

## FILES NOT TOUCHED

- `viewer/app/display-adapter.js`
- `viewer/app/ast-parser.js`
- `viewer/app/engine-adapter.js`
- `backend-api-v1.http-server/*` (backend not changed)

---

## Rollback ZIP

**Path:** `D:\G\_patches\P1_hint_convert_targeting_debug_and_fix.patch.zip`

To rollback:
```powershell
Expand-Archive -Path "D:\G\_patches\P1_hint_convert_targeting_debug_and_fix.patch.zip" -DestinationPath "D:\G" -Force
```

---

## Next Steps (If Still Not Working)

If console shows `astId=MISSING!` for compound expressions:

1. Check `[SURFACE-NUMS]` logs - are AST and surface counts equal?
2. If counts differ, multi-digit numbers may be split in KaTeX DOM
3. Fix: Merge adjacent digit nodes in `buildSurfaceNodeMap` before correlation
4. Alternative: Use value-based matching instead of pure position-based
