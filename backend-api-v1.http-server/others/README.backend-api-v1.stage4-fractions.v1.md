# @motor/backend-api-v1-http-server — Stage 4 passport (fractions basic)

This package exposes the backend HTTP API used by the Motor frontend to request
**a single math step**. Stage 3 fixed the shape of the contract and the server
skeleton; Stage 4 adds the first real fraction behaviour on top of that.

## What this package does at Stage 4

- Exposes `POST /engine/step` that accepts/returns JSON in the canonical
  `EngineStepRequest` / `EngineStepResponse*` format.
- Routes requests into the `EngineStepOrchestrator`, which:
  - picks a primitive id (for now, with a small hard-coded branch for simple
    fraction sums);
  - delegates to `PrimitiveRunner.ngin` for the actual math step.
- Uses `createNginPrimitiveRunnerDeps()` as the default primitive runner deps
  for production and tests.

## Real math implemented at Stage 4

The current NGIN implementation is intentionally small and conservative. It is
meant to prove the end-to-end pipeline rather than to cover all fraction cases.

Implemented primitives:

- `P0.FRAC_SIMPLIFY`
  - Input: a single fraction in the form `a/b` where `a, b` are positive
    integers.
  - Behaviour: computes `gcd(a, b)` and, if `gcd > 1`, returns a reduced
    fraction `(a/gcd)/(b/gcd)`.
  - If the fraction is already reduced, the runner returns `alreadySimplified`.

- `P4.FRAC_ADD_BASIC`
  - Input: a sum of two simple fractions in the form `a/b + c/d`
    (whitespace is ignored; all numbers are positive integers).
  - Behaviour: computes a single resulting fraction `(a*d + c*b) / (b*d)`,
    then reduces it by `gcd`.
  - This primitive is used by the Stage 4 HTTP e2e test for `1/3 + 2/5`,
    which should produce `11/15`.

These primitives operate directly on LaTeX strings. There is no real AST yet,
and MapMaster is not involved for Stage 4.

## HTTP-level guarantees at Stage 4

For `POST /engine/step` the following contract is expected to hold:

- The endpoint always returns a JSON response with one of the statuses:
  - `"ok"` — a single step was applied;
  - `"noStep"` — the request was understood, but no step is applicable;
  - `"error"` — the request was malformed or the backend failed.
- For `"ok"` responses:
  - `expressionId` is echoed from the request;
  - `fromLatex` is equal to the input `latex`;
  - `toLatex` is the result of exactly one primitive runner step;
  - `appliedPrimitiveId` matches the primitive id chosen by the orchestrator;
  - `invariantSetId` is echoed from the request.

At Stage 4 the only non-generic `"ok"` case that performs actual math is the
simple fraction sum handled by `P4.FRAC_ADD_BASIC`.

## Known limitations

- Only very simple, positive-integer fractions are supported.
- MapMaster and StepMaster are still outside of this package and not integrated.
- There is no full invariant-driven selection logic yet; the orchestrator uses
  a small hard-coded branch for `a/b + c/d` sums.
- The primitive runner still treats the "AST" as a plain LaTeX string.

These limitations are acceptable for the Stage 4 goal: prove that the HTTP API,
orchestrator, and primitive runner can perform a real, traceable single step.

## How to run tests (indicative)

Exact commands depend on the surrounding monorepo, but typically you should be
able to run something along the lines of:

- `pnpm install`
- `pnpm test` (or a scoped variant for `@motor/backend-api-v1-http-server`)

The important test for this stage is the HTTP e2e spec that sends `1/3 + 2/5`
to `/engine/step` and expects `11/15` in response.
