# Report 3: Surface Map Coverage & Gaps

## Overview

The surface map (`viewer/app/surface-map.js`) is responsible for:
1. Identifying interactive elements in the rendered LaTeX
2. Assigning `kind`, `role`, and `id` to each token
3. Correlating surface tokens with AST nodes (for operators only)

---

## Token Classification Schema

**File:** `viewer/app/surface-map.js`
**Function:** `classifyElement(el, classes, text)` (line 52-140)

### Return Type (per token):
```javascript
{
  kind: string,      // "Num", "Var", "BinaryOp", "Fraction", etc.
  role: string,      // "operand" or "operator"
  idPrefix: string,  // "num", "var", "op", "frac"
  atomic: boolean    // true if can't have children
}
```

### Classification Rules (excerpts):

| Text Pattern | Kind | Role | Notes |
|--------------|------|------|-------|
| `/^[0-9]+$/` | `"Num"` | `"operand"` | Pure digits |
| `/^[0-9]+\.[0-9]+$/` | `"Num"` | `"operand"` | Decimals |
| `/^[A-Za-z]$/` | `"Var"` | `"operand"` | Single letter |
| `+`, `-` (binary) | `"BinaryOp"` | `"operator"` | Has operatorIndex |
| `×`, `÷`, `·` | `"BinaryOp"` | `"operator"` | Has operatorIndex |
| Fraction bar | `"FracBar"` | `"operator"` | Has operatorIndex |

---

## astNodeId Assignment

### Where It Happens
**File:** `viewer/app/surface-map.js`
**Function:** Part of surface-to-AST correlation (line 630-680)

### Code Excerpt (line 655-658):
```javascript
// For each surface operator, find matching AST operator
if (/* match found */) {
  surfOp.astNodeId = astOp.nodeId;  // ONLY FOR OPERATORS
}
```

### **CRITICAL GAP:**
Numbers (`kind: "Num"`) do NOT get `astNodeId` assigned. This is because:
1. Numbers don't appear in the operator correlation loop
2. There's no separate loop for number nodes

---

## Example Surface Map Output

### Expression: `2+3`

```json
[
  {
    "id": "num-0",
    "kind": "Num",
    "role": "operand",
    "text": "2",
    "astNodeId": undefined,  // ← NOT SET
    "operatorIndex": undefined
  },
  {
    "id": "op-0",
    "kind": "BinaryOp",
    "role": "operator", 
    "text": "+",
    "astNodeId": "root",  // ← SET
    "operatorIndex": 0
  },
  {
    "id": "num-1",
    "kind": "Num",
    "role": "operand",
    "text": "3",
    "astNodeId": undefined,  // ← NOT SET
    "operatorIndex": undefined
  }
]
```

### Expression: `\frac{1}{3}+\frac{2}{5}`

```json
[
  {
    "id": "frac-0",
    "kind": "Fraction",
    "role": "operator",
    "astNodeId": "term[0]",
    "operatorIndex": 0
  },
  {
    "id": "num-0",
    "kind": "Num",
    "text": "1",
    "astNodeId": undefined  // ← Numerator has no astNodeId
  },
  {
    "id": "num-1",
    "kind": "Num", 
    "text": "3",
    "astNodeId": undefined  // ← Denominator has no astNodeId
  },
  {
    "id": "op-0",
    "kind": "BinaryOp",
    "text": "+",
    "astNodeId": "root",
    "operatorIndex": 0
  },
  // ... etc
]
```

---

## How Viewer Derives astNodeId for Numbers Today

### Answer: **It doesn't.**

**File:** `viewer/app/display-adapter.js`
**Code:** (line 87-88)
```javascript
const astNodeId =
  node && node.astNodeId ? String(node.astNodeId) : undefined;
```

For numbers, `node.astNodeId` is undefined, so `astNodeId` in the ClientEvent is undefined.

### Workaround Implemented

The backend uses `surfaceNodeKind` as a fallback:

**File:** `backend-api-v1.http-server/src/orchestrator/step.orchestrator.ts`
**Code:** (line 221)
```typescript
const isIntegerBySurface = req.surfaceNodeKind === "Num" 
  || req.surfaceNodeKind === "Number" 
  || req.surfaceNodeKind === "Integer";
```

If `surfaceNodeKind === "Num"` but `selectionPath === null`, backend uses `findFirstIntegerPath()` to guess the target.

---

## Fields Available Per Token

| Field | Type | Set For | Source |
|-------|------|---------|--------|
| `id` | string | All | Generated ("num-0", "op-0") |
| `kind` | string | All | `classifyElement()` |
| `role` | string | All | "operand" or "operator" |
| `text` | string | All | DOM textContent |
| `bbox` | object | All | DOM getBoundingClientRect |
| `operatorIndex` | number | Operators | Counting during generation |
| `astNodeId` | string | Operators only | Correlation with AST |
| `latexFragment` | string | Operators | Original LaTeX chunk |

---

## Gap Analysis for P1

### Current Problems:
1. **No astNodeId for numbers** → Backend can't resolve which integer was clicked
2. **No variant data** → Surface map doesn't know about primitives or alternatives
3. **No action metadata** → Each token is just position + classification

### Required for P1:
1. Either extend surface-map to assign astNodeId for numbers, OR
2. Backend returns full list of clickable targets with their paths
3. Store "variants" per target in viewer state

---

## Surface Map Generation Entry Point

**File:** `viewer/app/surface-map.js`
**Exported Function:** `buildSurfaceMap(container, latex, ast)`

**Flow:**
1. Scan DOM for `.katex-html` elements
2. Classify each element via `classifyElement()`
3. Collect operators and numbers
4. Correlate operators with AST nodes (via position matching)
5. Return array of surface nodes
