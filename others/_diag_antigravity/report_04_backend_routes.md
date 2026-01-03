# Report 4: Backend Entry Points & Routing

## Overview

The backend exposes HTTP endpoints for step processing. Two main paths exist:
1. **Entry Step** (legacy) — `/api/entry-step`
2. **Orchestrator V5** (current) — `/api/orchestrator/v5/step`

---

## Endpoint 1: `/api/entry-step`

### Handler
**File:** `backend-api-v1.http-server/src/server/HandlerPostEntryStep.ts`

### Request Schema
```typescript
{
  expressionLatex: string;       // Required: LaTeX expression
  selectionPath?: string;        // Optional: AST path ("root", "term[0]", etc.)
  operatorIndex?: number;        // Optional: Fallback if selectionPath missing
  sessionId?: string;            // Optional: Session identifier
  preferredPrimitiveId?: string; // Optional: For choice flow
  courseId?: string;             // Optional: Defaults to "default"
  token?: string;                // Optional: JWT auth
  policyId?: string;             // Optional: "teacher.debug" for debug mode
}
```

### Response Schema
```typescript
{
  status: "step-applied" | "no-candidates" | "engine-error" | "choice";
  expressionLatex?: string;      // New expression if step applied
  primitiveId?: string;          // Which primitive was used
  debugInfo?: object;            // Debug data (teacher mode only)
  choices?: StepChoice[];        // Available when status = "choice"
}
```

### Flow
```
HandlerPostEntryStep
  ↓ Parses body
  ↓ Builds OrchestratorStepRequest
  ↓ Calls runOrchestratorStep()
  ↓ Maps OrchestratorStepResult → EngineStepResponse
```

---

## Endpoint 2: `/api/orchestrator/v5/step` (PRIMARY)

### Handler
**File:** `backend-api-v1.http-server/src/server/HandlerPostOrchestratorStepV5.ts`

### Request Schema
```typescript
{
  sessionId: string;              // Required
  expressionLatex: string;        // Required
  selectionPath?: string | null;  // AST path
  operatorIndex?: number;         // Fallback
  courseId?: string;              // Defaults to "default"
  preferredPrimitiveId?: string;  // For choice flow (skip choice, apply directly)
  surfaceNodeKind?: string;       // NEW: "Num", "BinaryOp", etc. for fallback detection
  token?: string;                 // JWT auth
  policyId?: string;              // Policy override
  userRole?: string;              // Inferred from token
}
```

### Response Schema
```typescript
interface OrchestratorStepResult {
  status: "step-applied" | "no-candidates" | "engine-error" | "choice";
  history: StepHistory;           // Session history
  engineResult: {
    ok: boolean;
    newExpressionLatex?: string;
    errorCode?: string;
  } | null;
  debugInfo?: {
    allCandidates?: unknown[];
    [key: string]: unknown;
  } | null;
  primitiveDebug?: PrimitiveDebugInfo;
  choices?: StepChoice[];         // Available when status = "choice"
}

interface StepChoice {
  id: string;           // "int-to-frac"
  label: string;        // "Convert to fraction"
  primitiveId: string;  // "P.INT_TO_FRAC"
  targetNodeId: string; // "term[0]", "root"
}
```

### Handler Code (excerpt)
```typescript
// Line 68-80: Request parsing
const request: OrchestratorStepRequest = {
  sessionId: rawSessionId,
  courseId: typeof rawCourseId === "string" ? rawCourseId : "default",
  expressionLatex: rawLatex,
  selectionPath: typeof rawSelection === "string" ? rawSelection : null,
  operatorIndex: typeof obj["operatorIndex"] === "number" ? obj["operatorIndex"] : undefined,
  userRole: "student",
  userId: undefined,
  preferredPrimitiveId: typeof obj["preferredPrimitiveId"] === "string" ? obj["preferredPrimitiveId"] : undefined,
  surfaceNodeKind: typeof obj["surfaceNodeKind"] === "string" ? obj["surfaceNodeKind"] : undefined,
};
```

---

## Endpoint 3: Debug Endpoints

### `/api/debug/snapshots`
**File:** `backend-api-v1.http-server/src/debug/StepSnapshotStore.ts`

Returns recent step snapshots for debugging.

### `/api/debug/primitive-map`
**File:** `backend-api-v1.http-server/src/server/HandlerPostPrimitiveMapDebug.ts`

Returns primitive matching analysis for given expression.

---

## Server Registration

**File:** `backend-api-v1.http-server/src/server/EngineHttpServer.ts`

```typescript
// V5 endpoint registration (line ~120)
const v5Handler = createHandlerPostOrchestratorStepV5(deps);
fastify.post('/api/orchestrator/v5/step', v5Handler);

// Entry step (line ~100)
const entryHandler = createHandlerPostEntryStep(deps);
fastify.post('/api/entry-step', entryHandler);
```

---

## Which Endpoint the Viewer Uses

**File:** `viewer/app/engine-adapter.js`

```javascript
// Line 258: V5 endpoint
const v5Endpoint = "http://127.0.0.1:3000/api/orchestrator/v5/step";
```

The viewer exclusively uses `/api/orchestrator/v5/step`.

---

## Authentication

**File:** `backend-api-v1.http-server/src/auth/auth.service.ts`

- JWT tokens are optional
- If provided, extracts `role` (teacher/student) and `userId`
- Teacher role unlocks debug features
