# backend-api-v1 — Stage 5 · Step 2 — Invariant Course Loader (TzV1.1)

This patch adds the **course loader** and a minimal default invariant course
for the new `invariants.model.ts` / `InMemoryInvariantRegistry` API.

## Files

- `src/invariants/invariants.course-loader.ts`
  - Implements `loadInvariantRegistryFromFile({ path })`.
  - Resolves relative paths against the backend project root.
  - Reads a JSON course file, validates it with `validateInvariantModel(...)`
    and constructs `InMemoryInvariantRegistry`.
  - Throws on any IO / parse / validation error (fail-fast).

- `config/courses/default.course.invariants.json`
  - Minimal invariant model with:
    - primitives:
      - `P0.FRAC_SIMPLIFY`
      - `P4.FRAC_ADD_BASIC`
    - one invariant set `fractions-basic.v1` with two rules:
      - `I0.FRAC_SIMPLIFY`
      - `I4.FRAC_ADD_SAME_DEN_STEP1`

- `tests/Invariants.course-loader.default-course.test.ts`
  - Loads the default course file via the loader.
  - Asserts that:
    - primitives and invariant sets are present,
    - `P4.FRAC_ADD_BASIC` is available,
    - the set `fractions-basic.v1` exists and contains
      `I4.FRAC_ADD_SAME_DEN_STEP1`,
    - `findRulesByPrimitiveId("P4.FRAC_ADD_BASIC")` returns that rule.

## Notes

- Existing Stage 5.3 `config/invariants/*.json` and `MapMasterLite`
  remain untouched in this step.
- The new course loader is **data-only** and does not depend on MapMaster /
  StepMaster / HTTP server.
- Next steps on the roadmap will:
  - wire this loader into the server startup,
  - switch the orchestrator / MapMaster to use `InMemoryInvariantRegistry`
    from the course model.
