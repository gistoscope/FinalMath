# backend-api-v1 · Stage 3 · Block 4 — EngineStepOrchestrator tests (minimal skeleton v3)

This patch simplifies `tests/EngineStepOrchestrator.skeleton.test.ts` to focus
strictly on the stable, skeletal behaviour of `performStepWithOrchestrator(...)`
at Stage 3:

1. Unsupported modes:
   - Ensures that any mode other than `"preview"` yields `status: "error"`
     with `errorCode: "internal-error"` and a human-readable message.

2. Missing `primitiveRunnerDeps`:
   - Ensures that when no primitive runner configuration is provided,
     the orchestrator returns `status: "noStep"` with a meaningful message
     and echoes back `expressionId` and `fromLatex`.

We deliberately do **not** assert the delegation into `PrimitiveRunner` here,
because the concrete wiring and error/ok paths of the runner will evolve in
later blocks (once MapMaster and NGIN are fully integrated). Those paths will
be covered by dedicated integration tests instead.

Apply this archive from the `D:\08` root so that files land under:

- `backend-api-v1.http-server/tests/EngineStepOrchestrator.skeleton.test.ts`
- `backend-api-v1.http-server/README.backend-api-v1.stage3-block4.engine-orchestrator-tests.minimal-skeleton.v3.md`