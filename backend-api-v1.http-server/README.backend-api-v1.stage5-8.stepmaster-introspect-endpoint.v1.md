# backend-api-v1 — Stage 5.8 · StepMasterLite introspect HTTP endpoint

Goal: expose a debug endpoint that shows which primitive candidates
MapMasterLite produced for a given expression and which primitive id
StepMasterLite actually chose.

## Endpoint

- `GET /debug/stepmaster-introspect?latex=...&invariantSetId=...`
  - `latex` (required): expression in the same simplified LaTeX-like
    format that MapMasterLite understands (e.g. `1/3 + 2/5`).
  - `invariantSetId` (optional): defaults to `fractions-basic.v1`.

## Behaviour

- Builds an `EngineStepRequest` with:
  - `expressionId = "debug-stepmaster-introspect"`,
  - `mode = "preview"`,
  - `latex` from query,
  - `invariantSetId` from query or default,
  - whole-expression click surface.
- Runs `buildMapLite(request)` to obtain candidates.
- Runs `choosePrimitiveId(...)` with a simple context
  `{ expressionId, latex, invariantSetId, mode }`.
- Returns JSON:

  ```json
  {
    "status": "ok",
    "latex": "1/3 + 2/5",
    "invariantSetId": "fractions-basic.v1",
    "candidates": [
      {
        "primitiveId": "P4.FRAC_ADD_BASIC",
        "label": "Add two fractions",
        "scenarioId": "SCN.FRAC_ADD_DIFF_DEN",
        "teachingTag": "fractions.add.diff-den.step1"
      }
    ],
    "chosenPrimitiveId": "P4.FRAC_ADD_BASIC"
  }
  ```

- If `latex` is missing → HTTP 400 with `status = "error"` and
  `errorCode = "invalid-request"`.
- If an unexpected error occurs → HTTP 500 with
  `status = "error"` and `errorCode = "internal-error"`.

This endpoint is intended for debugging and tooling, so the schema is
optimised for clarity rather than long-term public stability.
