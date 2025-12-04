# backend-api-v1 — Stage 5.7 · Invariant scenario metadata for StepMaster

Goal: attach minimal scenario / teaching metadata to invariant records so
that StepMaster (and debug tools) can reason about "which scenario" a
candidate belongs to, without changing how invariants themselves behave.

## Types

- `src/invariants/invariant.types.ts`
  - `InvariantRecord` now includes optional fields:
    - `scenarioId?: string` — logical scenario identifier, e.g.
      `"SCN.FRAC_ADD_DIFF_DEN"`.
    - `teachingTag?: string` — human / analytics oriented tag, e.g.
      `"fractions.add.diff-den.step1"`.

## Config loader

- `src/invariants/config-loader.ts`
  - `InvariantFileEntry` schema extended with:
    - `scenarioId?: string`,
    - `teachingTag?: string`.
  - When loading config JSON, these fields are copied into the resulting
    `InvariantRecord` instances.

## Fractions config

- `config/invariants/fractions-basic.v1.json`
  - Updated entries:
    - `I4.FRAC_ADD_SAME_DEN_STEP1`:
      - `scenarioId = "SCN.FRAC_ADD_SAME_DEN"`
      - `teachingTag = "fractions.add.same-den.step1"`
    - `I4.FRAC_ADD_DIFF_DEN_STEP1`:
      - `scenarioId = "SCN.FRAC_ADD_DIFF_DEN"`
      - `teachingTag = "fractions.add.diff-den.step1"`
    - `I0.FRAC_SIMPLIFY`:
      - `scenarioId = "SCN.FRAC_SIMPLIFY"`
      - `teachingTag = "fractions.simplify.step1"`

## Debug endpoint

- `src/server/engineHttpServer.ts`
  - `/debug/invariants-introspect` response now includes `scenarioId` and
    `teachingTag` for each `applicableInvariant` record.

## Tests

- `tests/Invariants.metadata.fractions-basic.test.ts`
  - Verifies that the three basic fraction invariants expose the expected
    `scenarioId` and `teachingTag` values via `getInvariantsBySetId(...)`.

This metadata will be used in later stages by StepMasterLite policies and
by UI/debug tools, without impacting the core step selection behaviour.
