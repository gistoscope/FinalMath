# Backend API v1 — Stage 3 · Block 4
## EngineStepOrchestrator ⇄ PrimitiveRunner wiring (patch)

This patch replaces the **EngineStepOrchestrator** skeleton with a version
that actually calls the generic **PrimitiveRunner** and maps its result
back to `EngineStepResponse`.

It is intentionally conservative:

- Only `mode: "preview"` is supported. Any other mode returns
  `status: "error"` with `errorCode: "internal-error"`.
- If `primitiveRunnerDeps` are **not** provided, the orchestrator
  returns a safe `status: "noStep"` response and logs a message
  instead of throwing.
- If `primitiveRunnerDeps` **are** provided, the orchestrator calls
  `runPrimitiveStep(...)` and maps:
    - `PrimitiveRunnerResultOk`   → `EngineStepResponseOk`
    - `PrimitiveRunnerResultNoStep` → `EngineStepResponseNoStep`
    - `PrimitiveRunnerResultError` → `EngineStepResponseError`

MapMaster is still optional. When present, the orchestrator will try
to extract `primitiveIds` from its result; otherwise a generic
primitive id is used.

### Files in this patch

Root is expected to be **D:\08**.

- `backend-api-v1.http-server/src/orchestrator/EngineStepOrchestrator.ts`
  – new orchestrator implementation (Stage 3 wiring).
- `backend-api-v1.http-server/tests/EngineStepOrchestrator.skeleton.test.ts`
  – updated tests that cover the new behaviour.

### How to apply

1. Unzip the archive **into `D:\08`** so that files land under:

   - `D:\08\backend-api-v1.http-server\src\orchestrator\EngineStepOrchestrator.ts`
   - `D:\08\backend-api-v1.http-server\tests\EngineStepOrchestrator.skeleton.test.ts`

2. In PowerShell:

   ```powershell
   cd D:\08
   cd .\backend-api-v1.http-server
   pnpm install
   pnpm test
   ```

If all tests are green, the new orchestrator is in effect.

### Next steps (outside of this patch)

- Wire `primitiveRunnerDeps` in the real backend (HTTP server / CLI)
  so that `performStepWithOrchestrator` actually talks to NGIN
  instead of staying in the safe `noStep` mode.
- Plug a real MapMaster adapter once it is ready, so that the
  orchestrator uses real primitive ids instead of the generic
  placeholder.
