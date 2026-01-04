# backend-api-v1 — Stage 5.3.d · Fractions subtraction via invariants-from-file

Goal: extend the existing fraction pipeline so that subtraction of two
fractions with the same denominator is handled by the same invariant
table and MapMasterLite / PrimitiveRunner path as addition.

## Parser changes

- `src/mapmaster/MapMasterLite.ts`
  - `parseExpressionAstLite(...)` now understands:
    - `a/b + c/d`
    - `a/b - c/d`
    - `a/b`
    - `-a/b`
  - Subtraction is represented as a "sum" where the right fraction has a
    negative numerator (e.g. `5/7 - 2/7` → `5/7 + (-2)/7` in the AST).

## Engine primitive changes

- `src/orchestrator/PrimitiveRunner.ngin.ts`
  - `tryAddFractions(...)` now matches both `a/b + c/d` and `a/b - c/d`.
  - The sign is taken into account by interpreting subtraction as
    `a/b + (-c)/d` before computing the result and reducing by gcd.
  - The existing primitive id `P4.FRAC_ADD_BASIC` is reused for both
    addition and subtraction of fractions.

## Tests

- `tests/MapMasterLite.fractions-sub-same-den.test.ts`
  - Verifies that `buildMapLite(...)` on `5/7 - 2/7` with
    `invariantSetId = "fractions-basic.v1"` returns at least one
    candidate with `primitiveId = "P4.FRAC_ADD_BASIC"`.

- `tests/EngineHttpServer.frac-sub-same-den.e2e.test.ts`
  - Full HTTP round-trip:
    - request: `latex = "5/7 - 2/7"`, `invariantSetId = "fractions-basic.v1"`,
      whole-expression click;
    - `mapMaster` adapter delegates to `buildMapLite(...)` and passes
      its `primitiveIds` into the orchestrator;
    - response is `5/7 - 2/7 -> 3/7` with status `"ok"`.

This step keeps the invariant config unchanged but widens the set of
expressions that the "fractions-basic" set can handle through the
existing infrastructure.
