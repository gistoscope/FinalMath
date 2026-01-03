# Report 5: Choice Mechanism Audit

## Overview

The "choice" mechanism allows the backend to present multiple actions for a single click. Currently implemented for integer nodes (offering "Convert to fraction").

---

## "choice" Status Occurrences

### Definition
**File:** `backend-api-v1.http-server/src/orchestrator/step.orchestrator.ts`
**Line:** 65
```typescript
export type OrchestratorStepStatus =
    | "step-applied"
    | "no-candidates"
    | "engine-error"
    | "choice"; // NEW: Multiple actions available for this click
```

### Generation Point
**File:** `backend-api-v1.http-server/src/orchestrator/step.orchestrator.ts`
**Lines:** 244-266
```typescript
return {
    status: "choice",
    engineResult: null,
    history,
    choices: [
        {
            id: "int-to-frac",
            label: "Convert to fraction",
            primitiveId: "P.INT_TO_FRAC",
            targetNodeId: targetPath,
        }
    ],
    // ...
};
```

### Frontend Detection
**File:** `viewer/app/main.js`
**Line:** 830
```javascript
if (status === "choice" && res.result.meta && res.result.meta.choices) {
  const choices = res.result.meta.choices;
  showChoicePopup(choices, clickContext, res.result.latex);
}
```

---

## "choices" Field Occurrences

| File | Line | Purpose |
|------|------|---------|
| `step.orchestrator.ts` | 79 | Interface definition |
| `step.orchestrator.ts` | 249-256 | Array construction |
| `backend-step.types.ts` | 48 | Type definition |
| `HandlerPostEntryStep.ts` | 139 | Response mapping |
| `orchestratorV5Client.js` | 80 | Client extraction |
| `main.js` | 128-188 | Popup display |
| `engine-adapter.js` | 324, 332 | V5 response mapping |

---

## preferredPrimitiveId Occurrences

### Purpose
When user selects a choice from popup, the viewer sends a new request with `preferredPrimitiveId` set. This tells the backend to skip the choice flow and apply directly.

### Backend Check
**File:** `backend-api-v1.http-server/src/orchestrator/step.orchestrator.ts`
**Line:** 211
```typescript
if (ast && !req.preferredPrimitiveId) {
    // Only show choice if user hasn't already chosen
    // ... integer detection and choice response
}
```

### Request Parsing
**File:** `backend-api-v1.http-server/src/server/HandlerPostOrchestratorStepV5.ts`
**Line:** 77
```typescript
preferredPrimitiveId: typeof obj["preferredPrimitiveId"] === "string" ? obj["preferredPrimitiveId"] : undefined,
```

### Frontend Sending
**File:** `viewer/app/main.js`
**Line:** 239
```javascript
preferredPrimitiveId: primitiveId,
```

---

## P.INT_TO_FRAC Occurrences

| File | Line | Context |
|------|------|---------|
| `step.orchestrator.ts` | 253 | Hardcoded in choices array |
| `primitives.registry.v5.ts` | 392, 400 | Primitive definition |
| `primitive.runner.ts` | 164 | Execution case |
| `PrimitivePatterns.registry.ts` | 121 | Pattern matching entry |
| `mapmaster.rules.mixed.stage1.ts` | 67 | Support candidate |

---

## Integer Detection Logic

### Backend Detection (Dual-Path)
**File:** `backend-api-v1.http-server/src/orchestrator/step.orchestrator.ts`
**Lines:** 220-223
```typescript
// Path 1: AST-based (if selectionPath resolves to integer)
const isIntegerByAst = clickedNode && clickedNode.type === "integer";

// Path 2: Surface-based (if surfaceNodeKind sent by viewer)
const isIntegerBySurface = req.surfaceNodeKind === "Num" 
    || req.surfaceNodeKind === "Number" 
    || req.surfaceNodeKind === "Integer";

if (isIntegerByAst || isIntegerBySurface) {
    // Return choice response
}
```

### Frontend Detection (for Request Type)
**File:** `viewer/app/engine-adapter.js`
**Line:** 196
```javascript
const isInteger = kind === "Num" || kind === "Number" || kind === "Integer";
```

---

## Why "Popup Appears But Clicking Does Nothing" — Plausible Causes

### Cause 1: Wrong targetNodeId
**Location:** `step.orchestrator.ts:254`
**Issue:** If `targetPath` resolves to wrong AST node or "root" when root is a binaryOp, apply fails.
**Evidence:** Uses `findFirstIntegerPath()` as guess when AST path missing.

### Cause 2: selectionPath Mismatch
**Location:** `main.js:182`
**Issue:** If `choice.targetNodeId` is undefined, falls back to `clickContext.selectionPath` which may be null.
```javascript
const targetPath = choice.targetNodeId || clickContext.selectionPath || "root";
```

### Cause 3: Missing Request Field
**Location:** `orchestratorV5Client.js:14`
**Issue:** Client may not send `preferredPrimitiveId` correctly.

### Cause 4: Backend Path Mismatch
**Location:** `step.orchestrator.ts:211`
**Issue:** When `preferredPrimitiveId` is set, backend skips choice but may not find matching candidate if selectionPath wrong.

### Cause 5: surfaceNodeKind Not Sent
**Location:** `engine-adapter.js:268`
**Issue:** If viewer doesn't send `surfaceNodeKind`, backend can't detect integer via surface fallback.

### Cause 6: Primitive Not Registered
**Location:** `primitives.registry.v5.ts`
**Issue:** If P.INT_TO_FRAC not in registry for current course, execution fails.

### Cause 7: Request Type Wrong
**Location:** `engine-adapter.js:198`
**Issue:** If integer click doesn't trigger `applyStep`, backend never gets to choice logic.

---

## Flow Diagram: Choice Protocol

```
[1] User clicks integer "2" in "2+3"
    ↓
[2] Viewer: toEngineRequest() → type: "applyStep" (isInteger = true)
    ↓
[3] Viewer: POST /api/orchestrator/v5/step
    {
      expressionLatex: "2+3",
      selectionPath: null,  // ← Numbers don't have astNodeId
      surfaceNodeKind: "Num"
    }
    ↓
[4] Backend: orchestrator detects integer
    isIntegerByAst: false (path is null/root → binaryOp)
    isIntegerBySurface: true (surfaceNodeKind = "Num")
    ↓
[5] Backend: Returns status: "choice"
    choices: [{ primitiveId: "P.INT_TO_FRAC", targetNodeId: "term[0]" }]
    ↓
[6] Viewer: showChoicePopup()
    ↓
[7] User clicks "Convert to fraction" button
    ↓
[8] Viewer: applyChoice()
    POST /api/orchestrator/v5/step
    {
      expressionLatex: "2+3",
      selectionPath: "term[0]",  // ← From choice.targetNodeId
      preferredPrimitiveId: "P.INT_TO_FRAC"
    }
    ↓
[9] Backend: preferredPrimitiveId set → skip choice
    Execute P.INT_TO_FRAC on term[0]
    ↓
[10] Response: status: "step-applied"
     newExpressionLatex: "\\frac{2}{1}+3"
```
