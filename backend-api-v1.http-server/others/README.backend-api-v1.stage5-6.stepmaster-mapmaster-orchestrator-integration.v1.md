# backend-api-v1 — Stage 5.6 · StepMasterLite ⇄ MapMasterLite ⇄ Orchestrator integration

Goal: insert a small, reusable adapter that wires MapMasterLite and
StepMasterLite together and exposes them as a generic `MapMasterLike`
dependency for `EngineStepOrchestrator`.

## Files

- `src/stepmaster/StepMasterLite.ts`
  - Completed the implementation (no placeholders):
    - `StepMasterPolicyContext`,
    - `StepMasterLiteDeps`,
    - `StepMasterInput`,
    - `choosePrimitiveId(...)` — returns the first candidate's `primitiveId`
      or `undefined` when there are no candidates.

- `tests/StepMasterLite.basic.test.ts`
  - Fully implemented tests for the basic policy:
    - empty candidate list → `undefined`;
    - multiple candidates → first candidate is chosen.

- `src/mapmaster/MapMasterStepMasterAdapter.ts`
  - Exposes `createMapMasterWithStepMasterLite(deps?)` which returns a
    `MapMasterLike` implementation expected by the orchestrator.
  - `planStep(...)`:
    1. Converts `OrchestratorMapMasterRequest` into an `EngineStepRequest`
       (whole-expression click surface).
    2. Calls `buildMapLite(...)` to obtain `candidates`.
    3. Builds a `StepMasterPolicyContext` from the request.
    4. Calls `choosePrimitiveId(...)` to pick a single primitive id.
    5. Returns `{ primitiveIds: [...] }` for the orchestrator.

- `tests/EngineStepOrchestrator.stepmaster-integration.test.ts`
  - Integration test that validates the full path:
    `EngineStepRequest → MapMasterLite → StepMasterLite → PrimitiveRunner.ngin → EngineStepResponseOk`
  - Scenario: `1/3 + 2/5` with `invariantSetId = "fractions-basic.v1"`
    results in a single step `11/15`.

## External contract

- The external orchestrator contract remains unchanged: it still depends
  only on `MapMasterLike` and expects a `{ primitiveIds: string[] }` plan.
- StepMasterLite currently implements a trivial policy but is now in the
  execution path, so future stages can refine the policy without changing
  the orchestrator or HTTP handler.
