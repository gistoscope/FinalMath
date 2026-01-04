# backend-api-v1 — Stage 5.5 · StepMasterLite skeleton

Goal: introduce a StepMaster layer that can later encode pedagogical
policies on top of MapMaster candidates, without yet wiring it into
the orchestrator.

## Files

- `src/stepmaster/StepMasterLite.ts`
  - Defines:
    - `StepMasterPolicyContext` — minimal context for policy decisions
      (expression id, latex, invariantSetId, mode).
    - `StepMasterLiteDeps` — reserved for future dependencies.
    - `StepMasterInput` — bundle of candidates + context.
    - `choosePrimitiveId(...)` — core selection function.
  - Current policy (MVP):
    - if `candidates` is empty → returns `undefined`;
    - otherwise → returns the first candidate's `primitiveId`.

- `src/stepmaster/index.ts`
  - Re-exports `choosePrimitiveId` and the associated types.

- `tests/StepMasterLite.basic.test.ts`
  - Verifies that:
    - no candidates → `undefined`;
    - multiple candidates → id of the first one.

## Next steps

- In a later stage, the orchestrator will call StepMasterLite after
  MapMaster to choose which primitive to run when several candidates
  are available.
