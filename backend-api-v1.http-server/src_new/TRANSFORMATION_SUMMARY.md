# Backend API v1 Transformation Summary

## Overview

This document summarizes the transformation of the raw Node.js HTTP server to a decorator-based Express application with dependency injection.

## Source (`src/`) → Target (`src_new/`)

### Original Architecture

- Raw `http.createServer()` with manual routing in `engineHttpServer.ts`
- If-else chains for route matching
- Handler functions in separate files
- No dependency injection
- No decorators

### New Architecture

- Express with `tsyringe` for dependency injection
- Controller classes with decorators: `@Controller`, `@POST`, `@GET`, `@UseDTO`, `@Use`
- Service classes with `@injectable()`
- DTOs for request validation using `class-validator`
- Centralized controller registration

## Feature Mapping

| Original Handler                   | New Feature             | Controller               | Endpoints                                   |
| ---------------------------------- | ----------------------- | ------------------------ | ------------------------------------------- |
| `HandlerPostEntryStep.ts`          | `features/engine`       | `EngineController`       | `POST /api/entry-step`, `POST /engine/step` |
| `HandlerPostUndoStep.ts`           | `features/engine`       | `EngineController`       | `POST /api/undo-step`                       |
| `HandlerPostHintRequest.ts`        | `features/engine`       | `EngineController`       | `POST /api/hint-request`                    |
| `HandlerPostOrchestratorStepV5.ts` | `features/orchestrator` | `OrchestratorController` | `POST /api/orchestrator/v5/step`            |
| `HandlerPostAstDebug.ts`           | `features/debug`        | `DebugController`        | `POST /api/ast-debug`                       |
| `HandlerPostMapMasterDebug.ts`     | `features/debug`        | `DebugController`        | `POST /api/mapmaster-debug`                 |
| `HandlerPostMapMasterGlobalMap.ts` | `features/debug`        | `DebugController`        | `POST /api/mapmaster-global-map`            |
| `HandlerPostStepDebug.ts`          | `features/debug`        | `DebugController`        | `POST /api/step-debug`                      |
| `HandlerPostPrimitiveMapDebug.ts`  | `features/debug`        | `DebugController`        | `POST /api/primitive-map-debug`             |
| `HandlerPostInstrument.ts`         | `features/debug`        | `DebugController`        | `POST /api/instrument`                      |
| `HandlerReporting.ts`              | `features/reporting`    | `ReportingController`    | `GET /api/teacher/student-progress`         |
| Debug endpoints                    | `features/debug`        | `DebugTraceController`   | `/debug/*`                                  |

## Directory Structure

```
src_new/
├── app.ts                    # Express app configuration
├── index.ts                  # Entry point
├── registry.ts               # Dependency injection setup
├── core/
│   ├── controller/           # Controller registration
│   ├── decorator/            # Custom decorators
│   ├── errors/               # Exception classes
│   ├── types/                # Shared types
│   └── validator/            # DTO validation
└── features/
    ├── auth/                 # Authentication feature
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   ├── auth.middleware.ts
    │   └── dtos/
    ├── debug/                # Debug endpoints (Dev Tool)
    │   ├── debug.controller.ts
    │   ├── debug.service.ts
    │   └── dtos/
    ├── engine/               # Core step endpoints
    │   ├── engine.controller.ts
    │   ├── engine.service.ts
    │   └── dtos/
    ├── health/               # Health check endpoints
    │   └── health.controller.ts
    ├── orchestrator/         # V5 orchestrator endpoints
    │   ├── orchestrator.controller.ts
    │   ├── orchestrator.service.ts
    │   └── dtos/
    ├── reporting/            # Analytics & reporting
    │   ├── reporting.controller.ts
    │   ├── reporting.service.ts
    │   └── dtos/
    └── user/                 # User management
        ├── user.service.ts
        └── dtos/
```

## Key Changes

### 1. Controller Pattern

**Before:**

```javascript
if (req.method === "POST" && url === "/api/entry-step") {
  response = await HandlerPostEntryStep(parsedBody, handlerDeps);
}
```

**After:**

```typescript
@Controller("/api")
export class EngineController {
  @POST("/entry-step")
  @UseDTO(EntryStepDto)
  async entryStep(req: Request, res: Response) {
    const result = await this.engineService.handleEntryStep(req.body);
    return res.status(200).json(result);
  }
}
```

### 2. Dependency Injection

**Before:**

```javascript
const handlerDeps = { invariantRegistry, policy, logger };
response = await HandlerPostEntryStep(parsedBody, handlerDeps);
```

**After:**

```typescript
@injectable()
export class EngineService {
  constructor(@inject(HANDLER_DEPS_TOKEN) private deps: HandlerDeps) {}
}
```

### 3. Request Validation

**Before:**

```javascript
if (typeof rawLatex !== "string") {
  return makeError("engine-error", "Field 'expressionLatex' is required.");
}
```

**After:**

```typescript
export class EntryStepDto {
  @IsNotEmpty({ message: "Field 'expressionLatex' is required." })
  @IsString()
  expressionLatex!: string;
}
```

## Required Dependencies

Add these to your `package.json`:

```json
{
  "dependencies": {
    "express": "^4.18.x",
    "cors": "^2.8.x",
    "morgan": "^1.10.x",
    "passport": "^0.7.x",
    "passport-jwt": "^4.0.x",
    "reflect-metadata": "^0.2.x",
    "tsyringe": "^4.8.x",
    "class-validator": "^0.14.x",
    "class-transformer": "^0.5.x",
    "pino": "^8.x",
    "pino-pretty": "^10.x"
  },
  "devDependencies": {
    "@types/express": "^4.17.x",
    "@types/cors": "^2.8.x",
    "@types/morgan": "^1.9.x",
    "@types/passport": "^1.0.x",
    "@types/passport-jwt": "^4.0.x"
  }
}
```

## TypeScript Configuration

Ensure these settings in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Next Steps

1. Install required dependencies
2. Run TypeScript compilation to check for type errors
3. Update the entry point (`index.ts`) if needed
4. Test each endpoint to ensure functionality is preserved
5. Remove deprecated `step` feature (use `engine` instead)
