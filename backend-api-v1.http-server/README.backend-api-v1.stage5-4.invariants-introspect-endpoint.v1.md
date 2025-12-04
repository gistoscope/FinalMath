# backend-api-v1 — Stage 5.4 · Invariants introspect HTTP endpoint

Goal: expose a small debug endpoint that shows which invariants are
applicable for a given LaTeX expression and invariant set id.

## Endpoint

- `GET /debug/invariants-introspect?latex=...&invariantSetId=...`
  - `latex` (required): LaTeX-like string for simple fraction expressions,
    e.g. `1/3 + 2/5`, `1/3 + 2/3`, `5/7 - 2/7`, `6/8`.
  - `invariantSetId` (optional): defaults to `fractions-basic.v1`.

## Behaviour

- Parses the expression using the same simplified patterns as MapMasterLite:
  - `a/b + c/d`
  - `a/b - c/d`
  - `a/b`
  - `-a/b`
- Builds a synthetic "whole expression" surface selection.
- Fetches invariants via `getInvariantsBySetId(invariantSetId)` and
  evaluates their `when(...)` predicates.
- Returns JSON:

  ```json
  {
    "status": "ok",
    "latex": "1/3 + 2/5",
    "invariantSetId": "fractions-basic.v1",
    "surface": { "surfaceNodeId": "surf-whole-expression", "selection": [] },
    "applicableInvariants": [
      {
        "id": "I4.FRAC_ADD_DIFF_DEN_STEP1",
        "description": "First step for adding two fractions with different denominators.",
        "priority": 10,
        "primitiveIds": ["P4.FRAC_ADD_BASIC"]
      }
    ],
    "primitiveCandidates": [
      { "primitiveId": "P4.FRAC_ADD_BASIC" }
    ]
  }
  ```

- If `latex` is missing → HTTP 400 with `status = "error"` and
  `errorCode = "invalid-request"`.
- If the expression shape is not recognised → `status = "ok"` with empty
  `applicableInvariants` and `primitiveCandidates`, plus a short note.

This endpoint is intended for debugging / development and is not a
student-facing API. It makes it easier to see how the invariant table
reacts to a given expression and selection.
