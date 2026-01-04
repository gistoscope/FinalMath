# backend-api-v1 · Stage 3 · Block 4 — EngineStepOrchestrator tests (delegate error path v2)

This patch replaces `tests/EngineStepOrchestrator.skeleton.test.ts` with a
simpler and more robust version that focuses on the observable contract of
`performStepWithOrchestrator(...)` without depending on the exact internal
details of `PrimitiveRunner`.

The three test cases are:

1. Unsupported modes:
   - Verifies that any mode other than `"preview"` results in
     `EngineStepResponseError` with `status: "error"` and
     an `"internal-error"` code.
2. Missing `primitiveRunnerDeps`:
   - Verifies that when no primitive runner configuration is provided,
     the orchestrator returns `EngineStepResponseNoStep` with a meaningful
     message and echoes back `expressionId` and `fromLatex`.
3. Delegation to `PrimitiveRunner` (error path):
   - Provides a minimal `primitiveRunnerDeps` object and uses `vi.spyOn`
     to mock `PrimitiveRunner.runPrimitiveStep` so that it rejects with
     `Error("primitive runner failed")`.
   - Confirms that:
     - `runPrimitiveStep` is called exactly once, i.e. the orchestrator
       delegates to the primitive runner, and
     - the final `EngineStepResponse` has `status: "error"` and carries
       through the original `expressionId`.

Apply this archive from the `D:\08` root so that files land under:

- `backend-api-v1.http-server/tests/EngineStepOrchestrator.skeleton.test.ts`
- `backend-api-v1.http-server/README.backend-api-v1.stage3-block4.engine-orchestrator-tests.delegate-error-mock.v2.md`