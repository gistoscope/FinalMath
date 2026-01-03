# Integer Choice E2E - Implementation Report

## Summary

Clicking an integer node in the Viewer opens a Choice UI popup. Users can select "Convert to Fraction" which converts `N` to `\frac{N}{1}`.

## Changes Made

### Backend

| File | Change |
|------|--------|
| `src/protocol/backend-step.types.ts` | Added `"choice"` status, `StepChoice` interface, `preferredPrimitiveId` |
| `src/orchestrator/step.orchestrator.ts` | Integer detection returns `status:"choice"` with choices array |
| `src/server/HandlerPostOrchestratorStepV5.ts` | **Fixed: parses `preferredPrimitiveId` from request** |
| `src/server/HandlerPostEntryStep.ts` | Parses `preferredPrimitiveId` (entry-step path) |

### Viewer (Frontend)

| File | Change |
|------|--------|
| `app/client/orchestratorV5Client.js` | Added `choices` and `preferredPrimitiveId` fields |
| `app/engine-adapter.js` | Allow Num/Integer clicks; handle `status:"choice"` |
| `app/main.js` | Added `showChoicePopup()` and `applyChoice()` functions |

### Tests

| File | Purpose |
|------|---------|
| `tests/integer-choice.test.ts` | Unit tests for choice protocol |
| `tests/integer-choice-e2e.test.ts` | **E2E contract test** (3 tests) |

## E2E Contract Verification

```
✓ Step 1: clicking integer returns status='choice' with choices array
✓ Step 2: sending preferredPrimitiveId returns status='step-applied' with result
✓ Full E2E: click integer in expression (2+3) -> choice -> apply -> result
```

## Manual Testing Steps

1. Start backend:
   ```
   cd D:\G\backend-api-v1.http-server
   npm run dev
   ```

2. Start viewer:
   ```
   cd D:\G\viewer
   npm run dev
   ```

3. In browser, select test expression: `2+3`

4. **Click on the `2`** (the integer node, not the `+` operator)

5. A popup should appear with "Convert to fraction" option

6. Click the option → The `2` should become `\frac{2}{1}`

## Test Commands

```powershell
cd D:\G\backend-api-v1.http-server
npx vitest run tests/integer-choice-e2e.test.ts tests/integer-choice.test.ts
```

Expected: 9/9 tests passed.
