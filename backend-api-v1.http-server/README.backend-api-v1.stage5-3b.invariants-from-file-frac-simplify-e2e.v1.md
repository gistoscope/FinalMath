# backend-api-v1 — Stage 5.3.b · Fraction simplify e2e via invariants-from-file

Goal: prove that the invariant config (`fractions-basic.v1.json`) drives a
full HTTP round-trip for a second scenario: simplifying a single fraction.

## New test

- `tests/EngineHttpServer.frac-simplify.e2e.test.ts`
  - Sends POST `/engine/step` with:
    - `latex = "6/8"`,
    - `invariantSetId = "fractions-basic.v1"`,
    - `clientEvent` = whole-expression click.
  - Orchestrator deps:
    - `primitiveRunnerDeps` — real `createNginPrimitiveRunnerDeps()`.
    - `mapMaster` — thin adapter over `buildMapLite(...)`:
      - builds an `EngineStepRequest` from the MapMaster request,
      - runs `buildMapLite`,
      - returns `{ primitiveIds: [...] }` based on candidates.
  - Asserts that the HTTP response is:
    - `status = "ok"`,
    - `fromLatex = "6/8"`,
    - `toLatex = "3/4"`.

## Relation to invariants-from-file

- Uses `fractions-basic.v1.json` entry `I0.FRAC_SIMPLIFY` → `P0.FRAC_SIMPLIFY`.
- Confirms that the entire pipeline
  `config file → config-loader → MapMasterLite → Orchestrator → PrimitiveRunner.ngin → HTTP`
  works for the simplify scenario.

This file documents the technical scope of Stage 5.3.b so future stages can
safely extend the invariant set and add more e2e scenarios.
