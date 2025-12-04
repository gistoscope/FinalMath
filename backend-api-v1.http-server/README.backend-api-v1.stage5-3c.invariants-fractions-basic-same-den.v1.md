# backend-api-v1 — Stage 5.3.c · Extend fractions-basic invariants (same denominator)

Goal: extend `fractions-basic.v1` so that addition of two fractions with the
same denominator is also covered by invariants loaded from config files.

## Changes

- `config/invariants/fractions-basic.v1.json`
  - Added invariant `I4.FRAC_ADD_SAME_DEN_STEP1`:
    - `shape.kind = "frac-sum"`,
    - `shape.denominators = "equal"`,
    - `surface.mode = "whole-expression"`,
    - `primitiveIds = ["P4.FRAC_ADD_BASIC"]`.

- `tests/MapMasterLite.fractions-same-den.test.ts`
  - Verifies that `buildMapLite(...)` on `"1/3 + 2/3"` with
    `invariantSetId = "fractions-basic.v1"` returns at least one candidate
    with `primitiveId = "P4.FRAC_ADD_BASIC"`.

- `tests/EngineHttpServer.frac-add-same-den.e2e.test.ts`
  - Full HTTP round-trip:
    - request: `latex = "1/3 + 2/3"`, `invariantSetId = "fractions-basic.v1"`,
      whole-expression click;
    - `mapMaster` adapter delegates to `buildMapLite(...)`;
    - response is `1/3 + 2/3 -> 1/1` with status `"ok"`.

This step keeps the fraction-add primitive unchanged, but widens the set of
expressions where the invariant table can drive the end-to-end pipeline.
