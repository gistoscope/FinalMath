# NX Migration Analysis: Math Engine

**Status:** Evaluation Complete  
**Target:** Convert `backend/src/aaa/math-engine` -> `@final-math/math-engine` (NX Library)  
**Date:** 2026-01-31

## 1. Executive Summary

The `math-engine` directory contains a well-structured domain module responsible for parsing, orchestrating, and executing mathematical step transformations. It is a prime candidate for extraction into a standalone NX library because of its clear internal boundaries (`ast`, `engine`, `orchestrator`).

However, **module isolation is currently broken** by hard dependencies on the backend application layer (`SessionService` and `Registry`). These need to be inverted (abstracted) before the code can act as a reusable package.

## 2. Component Analysis

### 2.1 Code Structure

The internal structure is sound and ready for migration:

- **AST**: `ast/` (Parser & Utils) - Independent.
- **Engine**: `engine/` (Runners) - Independent.
- **Orchestrator**: `orchestrator/` - **Coupled**.
- **Invariants**: `invariants/` (Loaders) - **Coupled**.

### 2.2 Critical Coupling Points

The following dependencies prevent the module from being a standalone library:

| Component            | Dependency              | Location                 | Impact                                                         |
| :------------------- | :---------------------- | :----------------------- | :------------------------------------------------------------- |
| `StepOrchestrator`   | `SessionService`        | `../../modules/index.js` | Forces dependency on specific DB/Session implementation.       |
| `InvariantLoader`    | `registry.js` constants | `../../registry.js`      | Hardcodes file paths to the specific backend directory layout. |
| `StepHistoryService` | `SessionService`        | (Implicit)               | Part of the session management chain.                          |

**Note on Duplicate Core:** It appears `backend/src/aaa/math-engine` is identical to `backend/src/core`. The application currently uses `src/core` in its imports (e.g., `SessionService` imports `StepHistory` from `src/core`). This migration should replace `src/core` with the new library.

### 2.3 Dependencies

- **Internal**: `fs`, `path` (Node.js native).
- **External**: `tsyringe` (DI Container), `reflect-metadata`.
- **Missing/Implicit**: `@swc/core` or similar for build (handled by NX).

### 2.4 External Module Analysis (Deep Dive)

Per user request, the dependencies of the coupled modules were analyzed to see if they could also be moved.

**1. SessionService (`modules/session/SessionService.ts`)**  
_Status: **NOT Independent** (Infrastructure)_

- Depends on `StorageService` (filesystem/database access).
- Depends on `registry.js` for configuration tokens.
- Implements a concrete JSON-file based session store.
- **Recommendation**: Do NOT move. This is application-side infrastructure. The engine should define an interface (`HistoryProvider`) that this service implements.

**2. Registry (`src/registry.ts`)**  
_Status: **NOT Independent** (Application Root)_

- Acts as the Composition Root for the entire Backend API.
- Imports `process.env`, `JsonFileStorage`, `HttpServer` configs.
- **Recommendation**: Do NOT move. The library should be "configured" by the registry at runtime, not contain the registry source code.

**3. Types (`src/core`)**

- `SessionService` relies on `StepHistory` from `src/core`. Since `math-engine` is a clone of `core`, this confirms duplications.
- **Recommendation**: The new library should become the source of truth for `StepHistory`. `SessionService` should be updated to import types from `@final-math/math-engine`.

## 3. Migration Roadmap

### Phase 1: Workspace Initialization

Since the root is not yet an NX workspace, initialization is required.

```bash
# In repo root
npx nx@latest init
# > Integrated monorepo
# > TS / Node
```

### Phase 2: Create Library

Generate the scaffold for the new package.

```bash
# Generate library
npx nx g @nx/js:lib math-engine --directory=libs/math-engine --publishable --importPath=@final-math/math-engine

# Update compiler options in libs/math-engine/tsconfig.lib.json
# Ensure "emitDecoratorMetadata": true is set for tsyringe.
```

### Phase 3: Code Migration & Decoupling (The "Hard" Part)

**A. Move Code**
Copy the contents of `backend/src/aaa/math-engine/*` to `libs/math-engine/src/`.

**B. Refactor `orchestrator` (Dependency Inversion)**
Instead of importing `SessionService` directly, define a `HistoryProvider` interface.

_libs/math-engine/src/interfaces/HistoryProvider.ts_

```typescript
import { StepHistory } from "../stepmaster/step-master.types";

export interface HistoryProvider {
  getHistory(sessionId: string): Promise<StepHistory>;
  updateHistory(sessionId: string, history: StepHistory): Promise<void>;
}
```

_Update `StepOrchestrator.ts`:_

```typescript
// Remove: import { SessionService } from "../../modules/index.js";
// Add:
import { inject } from "tsyringe";
import { HistoryProvider } from "../interfaces/HistoryProvider";

export class StepOrchestrator {
  constructor(
    @inject("HistoryProvider") private readonly historyProvider: HistoryProvider
    // ...
  ) {}
}
```

**C. Refactor `invariants` (Configuration)**
Remove imports from `../../registry.js`. Inject a configuration object instead.

_libs/math-engine/src/config.ts_

```typescript
export const ENGINE_CONFIG = "ENGINE_CONFIG";
export interface EngineConfig {
  coursesDir: string;
  loaderBasePath: string;
}
```

### Phase 4: Integration

Update the main backend application to provide the concrete implementations.

_backend/src/server.ts (or DI setup)_

```typescript
import { SessionService } from "./modules/session";
import { registerMathEngine } from "@final-math/math-engine";

// Register the concrete service as the provider for the engine
container.register("HistoryProvider", { useClass: SessionService });
container.register("ENGINE_CONFIG", { useValue: { coursesDir: "..." } });
```

## 4. Conclusion

The `math-engine` is ready for migration structurally but requires **Code Refactoring** in `StepOrchestrator` and `InvariantLoader` to remove relative path imports to `../../`. Once these two links are broken via Dependency Injection interfaces, the engine can be fully isolated in `libs/math-engine`.
