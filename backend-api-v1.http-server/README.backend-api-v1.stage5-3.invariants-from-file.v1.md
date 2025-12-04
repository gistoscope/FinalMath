# backend-api-v1 — Stage 5.3.a · Invariants from config files

Goal: define invariant tables in external files and have the backend load them
at startup, so MapMasterLite works from data rather than hard-coded rules.

## Files

- `config/invariants/fractions-basic.v1.json`
  - JSON config for invariant set `fractions-basic.v1`.
  - Contains entries:
    - `I4.FRAC_ADD_DIFF_DEN_STEP1` → `P4.FRAC_ADD_BASIC` for `a/b + c/d` with different denominators.
    - `I0.FRAC_SIMPLIFY` → `P0.FRAC_SIMPLIFY` for reducible `a/b` (gcd(a,b) > 1).
- `src/invariants/invariant.types.ts`
  - Core types for `ExpressionAstLite`, `SurfaceSelectionLite`, and `InvariantRecord`.
- `src/invariants/config-loader.ts`
  - Loads all `*.json` from `config/invariants/`.
  - Builds `InvariantRecord[]` with `when(...)` predicates derived from `shape` and `surface` fields.
- `src/invariants/index.ts`
  - Public entry: re-exports types and `getInvariantsBySetId(...)`.
- `src/mapmaster/MapMasterLite.ts`
  - Now parses a tiny AST for `a/b + c/d` and `a/b`.
  - Looks up invariants via `getInvariantsBySetId(request.invariantSetId)`.
  - Returns candidates ordered by `priority`.

## Behaviour

- For requests with `invariantSetId = "fractions-basic.v1"` and a whole-expression click:
  - `latex = "1/3 + 2/5"` → one candidate with `primitiveId = "P4.FRAC_ADD_BASIC"`.
- For other expressions (or missing invariants) MapMasterLite returns an empty candidate list.

This file captures the technical spec for Stage 5.3.a so future stages can evolve
the invariant format while keeping the core contract stable.
