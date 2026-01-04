# backend-api-v1 — Stage 5.9 · StepMasterLite scenario-aware policy

Goal: make StepMasterLite aware of invariant scenarios so that, when
several candidates are available, it can choose according to a simple
teaching-oriented priority list instead of always picking the first
candidate.

## MapMaster candidates

- `src/mapmaster/MapMasterLite.ts`
  - `MapMasterCandidateLite` now includes optional fields:
    - `scenarioId?: string`,
    - `teachingTag?: string`.
  - When candidates are created from invariant records, these fields are
    copied from `InvariantRecord.scenarioId` / `.teachingTag`.

## StepMasterLite policy

- `src/stepmaster/StepMasterLite.ts`
  - Introduces `DEFAULT_SCENARIO_PRIORITY`:
    - `["SCN.FRAC_ADD_DIFF_DEN", "SCN.FRAC_ADD_SAME_DEN", "SCN.FRAC_SIMPLIFY"]`.
  - `StepMasterLiteDeps` now has an optional `scenarioPriority?: string[]`
    override for tests or future configuration.
  - `choosePrimitiveId(...)` behaviour:
    1. If there are no candidates → returns `undefined`.
    2. Otherwise, iterates over the scenario priority list and picks the
       first candidate whose `scenarioId` matches.
    3. If no candidate matches any scenario in the list, falls back to
       the first candidate (old behaviour).

## Tests

- `tests/StepMasterLite.basic.test.ts`
  - Verifies that:
    - no candidates → `undefined`;
    - candidates without scenario metadata → first candidate wins;
    - when both `SCN.FRAC_ADD_DIFF_DEN` and `SCN.FRAC_SIMPLIFY` are present,
      the `SCN.FRAC_ADD_DIFF_DEN` candidate is chosen.

This is the first scenario-level policy: it gives us a hook to prefer
"add fractions with different denominators" over other operations when
several invariants are simultaneously applicable, while keeping the
orchestrator contract unchanged.
