# Report 1: Executive Map — End-to-End Click/Selection Pipeline

## Overview

This report documents the complete flow from UI click event to backend response and back.

---

## Flow Diagram

```
UI Event (click/dblclick)
    ↓
DisplayAdapter._baseEvent() → ClientEvent object
    ↓
main.js: engineAdapter.processClientEvent()
    ↓
EngineAdapter.toEngineRequest() → EngineRequest
    ↓
EngineAdapter.run() → V5 endpoint call
    ↓
Backend: HandlerPostOrchestratorStepV5
    ↓
Backend: runOrchestratorStep()
    ↓
Backend: Integer detection / PrimitiveMaster
    ↓
Response (choice | step-applied | no-candidates)
    ↓
main.js: handleEngineResponse()
    ↓
UI: showChoicePopup() OR render new LaTeX
```

---

## Step-by-Step Details

### 1. UI Click Event Capture
- **File:** `viewer/app/display-adapter.js`
- **Function:** `_baseEvent(type, node, e)` (line 81-110)
- **Key fields built:**
  - `surfaceNodeId` (from node.id)
  - `surfaceNodeKind` (from node.kind) — "Num", "BinaryOp", etc.
  - `surfaceNodeRole` (from node.role)
  - `surfaceOperatorIndex` (from node.operatorIndex)
  - `astNodeId` (from node.astNodeId) — **CRITICAL: undefined for numbers**
  - `latex` — current expression

### 2. Surface Map Lookup
- **File:** `viewer/app/surface-map.js`
- **Key function:** `classifyElement(el, classes, text)` (line 52)
- **Number classification:** (line 63-65)
  ```javascript
  if (/^[0-9]+$/.test(t)) {
    return { kind: "Num", role: "operand", idPrefix: "num", atomic: true };
  }
  ```
- **astNodeId assignment:** Only done for operators (line 657)
  ```javascript
  surfOp.astNodeId = astOp.nodeId;
  ```
- **GAP:** Numbers (kind="Num") do NOT get astNodeId assigned

### 3. ClientEvent → EngineRequest Mapping
- **File:** `viewer/app/engine-adapter.js`
- **Function:** `toEngineRequest(clientEvent)` (line 170-222)
- **Request type determination:** (line 173-204)
  - `click + (isOperator || isInteger)` → `"applyStep"`
  - `click + other` → `"previewStep"`
  - `dblclick` → `"applyStep"`
  - `hover` → `"getHints"`
- **Integer detection:** (line 196)
  ```javascript
  const isInteger = kind === "Num" || kind === "Number" || kind === "Integer";
  ```

### 4. V5 Endpoint Call
- **File:** `viewer/app/engine-adapter.js`
- **Function:** `run(request)` (line 84-165)
- **V5 payload construction:** (line 260-269)
  ```javascript
  const v5Payload = {
    sessionId: "default-session",
    expressionLatex: request.clientEvent.latex,
    selectionPath: request.clientEvent.astNodeId || null,
    operatorIndex: request.clientEvent.astNodeId ? undefined : request.clientEvent.surfaceOperatorIndex,
    courseId: "default",
    userRole: "student",
    surfaceNodeKind: request.clientEvent.surfaceNodeKind || null,
  };
  ```
- **Endpoint:** `POST /api/orchestrator/v5/step`

### 5. Backend Handler
- **File:** `backend-api-v1.http-server/src/server/HandlerPostOrchestratorStepV5.ts`
- **Function:** `handlePostOrchestratorStepV5(body, deps)` (line 43-122)
- **Request parsing:** (line 68-80)
  - Parses `expressionLatex`, `selectionPath`, `operatorIndex`
  - Parses `preferredPrimitiveId` (for apply-after-choice)
  - Parses `surfaceNodeKind` (for integer detection fallback)

### 6. Orchestrator Step Logic
- **File:** `backend-api-v1.http-server/src/orchestrator/step.orchestrator.ts`
- **Function:** `runOrchestratorStep(ctx, req)` (line 82+)
- **Integer detection:** (line 210-266)
  - Checks `clickedNode.type === "integer"` (AST-based)
  - Checks `surfaceNodeKind === "Num"` (surface-based fallback)
  - Returns `status: "choice"` with `choices[]` array
- **Choice array:** (line 249-256)
  ```typescript
  choices: [{
    id: "int-to-frac",
    label: "Convert to fraction",
    primitiveId: "P.INT_TO_FRAC",
    targetNodeId: targetPath,
  }]
  ```

### 7. Response Flow Back to UI
- **File:** `viewer/app/engine-adapter.js`
- **Function:** `run()` return block (line 319-345)
- **Choice response construction:** (line 323-341)
  - Maps V5 result to standard response format
  - Includes `choices` array in `result.meta`

### 8. UI Response Handling
- **File:** `viewer/app/main.js`
- **Function:** Engine callback (line 810-850)
- **Choice detection:** (line 830-834)
  ```javascript
  if (status === "choice" && res.result.meta && res.result.meta.choices) {
    showChoicePopup(choices, clickContext, res.result.latex);
  }
  ```

### 9. Choice Popup Display and Action
- **File:** `viewer/app/main.js`
- **Function:** `showChoicePopup(choices, clickContext, latex)` (line 132-220)
- **Button click handler:** (line 179-186)
  ```javascript
  const targetPath = choice.targetNodeId || clickContext.selectionPath || "root";
  applyChoice(choice.primitiveId, targetPath, latex);
  ```

### 10. Apply Choice Request
- **File:** `viewer/app/main.js`
- **Function:** `applyChoice(primitiveId, targetPath, latex)` (line 223-260)
- **Request:** Calls `orchestratorV5Client.postStep()` with:
  - `expressionLatex`
  - `selectionPath: targetPath`
  - `preferredPrimitiveId: primitiveId`

---

## Key Field Mappings

| Viewer Field | Backend Field | Source |
|--------------|---------------|--------|
| `surfaceNodeId` | N/A | node.id from surface-map |
| `surfaceNodeKind` | `surfaceNodeKind` | node.kind ("Num", "BinaryOp") |
| `astNodeId` | `selectionPath` | Only set for operators |
| `surfaceOperatorIndex` | `operatorIndex` | Fallback when astNodeId missing |
| N/A | `preferredPrimitiveId` | Set on apply-choice request |

---

## Request Type Decision Tree

```
clientEvent.type === "click"
├── isOperator? (role=operator, kind=BinaryOp, etc.) → applyStep
├── isInteger? (kind=Num/Number/Integer) → applyStep
├── isDouble? (clickCount===2) → applyStep
└── else → previewStep

clientEvent.type === "dblclick" → applyStep
clientEvent.type === "hover" → getHints
clientEvent.type === "selectionChanged" → previewStep
```

---

## Where "choice" Protocol Lives

| Component | Location | Purpose |
|-----------|----------|---------|
| Status type | `step.orchestrator.ts:65` | Defines "choice" as valid status |
| Choice interface | `backend-step.types.ts:34-40` | StepChoice type definition |
| Choice generation | `step.orchestrator.ts:244-266` | Returns choice response for integers |
| preferredPrimitiveId check | `step.orchestrator.ts:211` | Skips choice if client already chose |
| Frontend parsing | `orchestratorV5Client.js:80` | Extracts choices from response |
| Popup display | `main.js:132-188` | Shows choice buttons |
| Apply choice | `main.js:223-260` | Sends back with preferredPrimitiveId |
