# backend-api-v1 — Stage 5 Passport (HTTP server + invariants + StepMaster)

This document is a high-level passport for the **backend-api-v1.http-server**
at the end of Stage 5. It is written for a new backend developer or for a
new chat that needs to continue work from this point.

## 1. Purpose

The backend provides a **one-step math engine API** over HTTP. The main job:

- accept a JSON step request from the front-end;
- decide which primitive transformation to run using invariants + MapMaster + StepMaster;
- execute the primitive via the NGIN-based runner;
- return a JSON response describing the single step.

Stage 5 focused on:

- loading invariants from JSON files (`config/invariants/*.json`);
- making MapMasterLite and StepMasterLite the single source of primitive selection;
- exposing debug endpoints for invariants and StepMaster;
- cleaning the orchestrator from hard-coded fraction cases.

## 2. Main entrypoints

- **HTTP server**
  - `src/server/engineHttpServer.ts`
  - Public endpoints:
    - `POST /engine/step` — main one-step API.
    - `GET /health` — health probe.
    - `GET /debug/invariants-introspect` — shows which invariants fire for a given expression.
    - `GET /debug/stepmaster-introspect` — shows MapMaster candidates and the primitive chosen by StepMaster.

- **Handler**
  - `src/server/HandlerPostEntryStep.ts`
  - Validates and normalises the incoming JSON into an `EngineStepRequest`
    (`src/protocol/backend-step.types.ts`).

## 3. Core flow (one step)

Request path for **`POST /engine/step`**:

1. **HTTP handler** parses JSON body into `EngineStepRequest`.
2. **EngineStepOrchestrator** (`src/orchestrator/EngineStepOrchestrator.ts`):
   - builds an `OrchestratorMapMasterRequest` from the request;
   - calls its `mapMaster.planStep(...)` dependency;
   - receives a plan object with primitive ids and passes them into the primitive runner;
   - returns a standardised `EngineStepResponse` (ok / noStep / error).
3. **MapMasterLite + StepMasterLite** (via adapter):
   - `src/mapmaster/MapMasterStepMasterAdapter.ts`
     - `createMapMasterWithStepMasterLite(...)` implements `MapMasterLike` for the orchestrator;
     - internally calls `buildMapLite(...)` and `choosePrimitiveId(...)`.
   - `src/mapmaster/MapMasterLite.ts`
     - parses a small subset of fraction expressions
       (`a/b + c/d`, `a/b - c/d`, `a/b`, `-a/b`);
     - uses invariant records to produce `MapMasterCandidateLite[]`.
   - `src/stepmaster/StepMasterLite.ts`
     - takes the candidates + context and chooses one primitive id using
       a scenario-aware policy.
4. **PrimitiveRunner**
   - `src/orchestrator/PrimitiveRunner.ngin.ts`
     - executes the chosen primitive using the underlying NGIN / engine;
     - currently supports:
       - fraction addition (same / different denominators, plus subtraction),
       - fraction simplification.

## 4. Invariants and scenarios

- Invariant config:
  - `config/invariants/fractions-basic.v1.json`
    - contains entries like `I4.FRAC_ADD_DIFF_DEN_STEP1`, `I4.FRAC_ADD_SAME_DEN_STEP1`, `I0.FRAC_SIMPLIFY`;
    - each invariant has:
      - `priority`,
      - `primitiveIds` (usually `["P4.FRAC_ADD_BASIC"]`),
      - optional `scenarioId` and `teachingTag` used by StepMasterLite.
- Types and loader:
  - `src/invariants/invariant.types.ts` — defines `InvariantRecord` and AST shapes.
  - `src/invariants/config-loader.ts` — loads JSON config into `InvariantRecord[]`.
  - `src/invariants/index.ts` — `getInvariantsBySetId(...)` entrypoint.

## 5. StepMasterLite policy (Stage 5 state)

- File: `src/stepmaster/StepMasterLite.ts`
- Input: `candidates: MapMasterCandidateLite[]` with optional `scenarioId` and `teachingTag`.
- Default scenario priority (Stage 5):
  - `SCN.FRAC_ADD_DIFF_DEN`
  - `SCN.FRAC_ADD_SAME_DEN`
  - `SCN.FRAC_SIMPLIFY`
- Behaviour:
  1. If there are no candidates → return `undefined` (no step).
  2. Otherwise, scan candidates using the priority list; if any candidate has
     a matching `scenarioId`, choose its `primitiveId`.
  3. If none match, fall back to the first candidate in the list.

This gives us a first teaching-oriented policy: we can prefer “add fractions
with different denominators” over “simplify” when both are technically
possible.

## 6. Debug endpoints

- `GET /debug/invariants-introspect`:
  - Input (query):
    - `latex` (required),
    - `invariantSetId` (optional, default `"fractions-basic.v1"`).
  - Output:
    - `applicableInvariants[]` with id, description, priority, primitiveIds,
      scenarioId, teachingTag.

- `GET /debug/stepmaster-introspect`:
  - Input (query):
    - `latex` (required),
    - `invariantSetId` (optional).
  - Output:
    - `candidates[]` from MapMasterLite with primitiveId, label, scenarioId, teachingTag;
    - `chosenPrimitiveId` selected by StepMasterLite.

These endpoints are purely diagnostic and not meant for students.

## 7. Tests and local usage

- Look into `tests/` for examples:
  - `EngineHttpServer.frac-add.e2e.test.ts`,
  - `EngineHttpServer.frac-sub-same-den.e2e.test.ts`,
  - `EngineStepOrchestrator.stepmaster-integration.test.ts`,
  - `Invariants.metadata.fractions-basic.test.ts`,
  - `StepMasterLite.basic.test.ts`,
  - plus MapMasterLite-focused tests.

Typical commands (from repo root):

- npm run test
- npm run build

## 8. What is finished vs. open for future stages

**Finished for Stage 5 (backend):**

- Stable `EngineStepRequest` / `EngineStepResponse` protocol for one-step engine.
- HTTP handler and server wrapper for `/engine/step` with health check.
- Fraction invariants loaded from file and used as the single source of truth.
- MapMasterLite + StepMasterLite integrated into the orchestration path.
- Primitive runner supports core fraction operations required by the current invariants.
- Debug endpoints for invariants and StepMaster are in place.

**Open for future stages (outside Stage 5):**

- Extending invariants and primitives beyond basic fractions to full arithmetic
  and algebra (negatives, parentheses, mixed numbers, more complex expressions).
- Richer StepMaster policies (student model, difficulty, paths, retries).
- Closer integration with the full Engine Lite / Core NGIN stack.
- Additional observability (logging, metrics) and production-hardening.
