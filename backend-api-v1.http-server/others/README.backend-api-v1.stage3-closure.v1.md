# Backend API v1 HTTP Server — Stage 3 Closure

This document describes the Stage 3 "structurally complete" state of the
`@motor/backend-api-v1-http-server` package.

Stage 3 is about freezing the *shape* of the backend service for a single
math step, not about full math coverage. All further work in Stage 4+ must
build on this contract without breaking it.

## What this package does at Stage 3

At this stage the package provides a stable HTTP API that:

- exposes a single endpoint for one-step transformations:
  - `POST /engine/step`
- accepts and returns JSON in a fixed format:
  - request: `EngineStepRequest`
  - response: `EngineStepResponse` (`ok | noStep | error`)

The server does **not** implement full fraction logic here. It only wires
the request through an orchestrator and a stubbed primitive runner.

## Frozen JSON contract (high level)

- `EngineStepRequest` (from `src/protocol/backend-step.types.ts`)
  - `expressionId: string`
  - `mode: "preview" | "apply"` (Stage 3/4 use `"preview"` only)
  - `latex: string`
  - `invariantSetId: string` (e.g. `"fractions-basic.v1"`)
  - `clientEvent` with Viewer selection information

- `EngineStepResponse` (union by `status`):
  - `"ok"`:
    - echoes `expressionId`
    - `fromLatex`, `toLatex`
    - optional `invariantSetId`, `appliedPrimitiveId`, `step`
  - `"noStep"`:
    - echoes `expressionId`
    - `fromLatex`
    - optional `invariantSetId`, `reason`, `message`
  - `"error"`:
    - echoes `expressionId` (when known)
    - `errorCode`, `message`

This contract is considered *frozen* for Stage 3. Future stages may extend
it, but must not introduce breaking changes.

## Internal architecture at Stage 3

The package is structured as:

- **HTTP layer**
  - `src/server/engineHttpServer.ts` — sets up the HTTP server and routes
    `POST /engine/step` to the handler.
  - `src/server/HandlerPostEntryStep.ts` — parses JSON, validates the
    request and invokes the orchestrator.
  - `src/server/cliEngineHttpServer.ts` — CLI entry point to start the server.

- **Orchestrator**
  - `src/orchestrator/EngineStepOrchestrator.ts`
  - Responsible for:
    - enforcing `mode === "preview"` at Stage 3,
    - selecting a list of candidate primitive IDs (using a simple heuristic
      and `invariantSetId`),
    - calling the primitive runner,
    - mapping `PrimitiveRunnerResult` (`ok | noStep | error`) into
      `EngineStepResponse`.

- **Primitive runner (skeleton + stub engine)**
  - `src/orchestrator/PrimitiveRunner.ts` — defines the stable
    `PrimitiveRunnerRequest` / `PrimitiveRunnerResult` types.
  - `src/orchestrator/PrimitiveRunner.ngin.ts` — Stage 3 stub implementation
    that:
    - accepts `PrimitiveRunnerRequest`,
    - never throws on valid input,
    - returns one of `ok / noStep / error` with simple, predictable data
      (no real math engine yet).

The real NGIN / engine-lite integration and fraction primitives live in
Stage 4+ and **are not part of Stage 3 closure** for this package.

## Tests at Stage 3

Skeleton tests are provided to guarantee the contract behaviour:

- Handler + HTTP contract tests:
  - `tests/HandlerPostEntryStep.contract.test.ts`
  - `tests/EngineHttpServer.contract.test.ts`
- Orchestrator + primitive runner tests:
  - `tests/EngineStepOrchestrator.skeleton.test.ts`
  - `tests/PrimitiveRunner.skeleton.test.ts`

These tests ensure that:

- the endpoint exists and responds with valid JSON,
- invalid or unsupported requests yield `status: "error"`,
- missing runner dependencies yield `status: "noStep"`,
- the stub primitive runner can produce `ok`, `noStep` and `error` results
  without throwing.

## Summary

Stage 3 for `@motor/backend-api-v1-http-server` is **structurally complete**:

- JSON contract is defined and frozen,
- HTTP endpoint and handler are wired and tested,
- orchestrator and primitive runner interfaces are stable,
- a stub implementation exists that can execute the full request → response
  pipeline without relying on the real math engine.

Stage 4+ will plug in the real engine-lite, fraction primitives and
MapMaster/StepMaster integration while preserving this contract.
