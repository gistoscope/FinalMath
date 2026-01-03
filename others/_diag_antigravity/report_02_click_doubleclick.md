# Report 2: Click vs DoubleClick Inventory

## Current State Summary

The codebase currently uses a **request type model** (applyStep vs previewStep) rather than explicit single/double-click routing. There is NO dedicated double-click handler or "two-step selection" model currently implemented.

---

## Click Handling Locations

### 1. DisplayAdapter Event Creation
**File:** `viewer/app/display-adapter.js`

```javascript
// Line 75-110: _baseEvent() creates event object
// Does NOT distinguish single vs double click - just passes clickCount
_baseEvent(type, node, e) {
  return {
    type,  // "click", "hover", "selectionChanged", etc.
    // ... other fields
  };
}
```

**Observation:** `type` is passed from caller. No internal single/double logic.

---

### 2. Engine Adapter Request Type Mapping
**File:** `viewer/app/engine-adapter.js`

```javascript
// Line 170-218: toEngineRequest()
switch (clientEvent && clientEvent.type) {
  case "click":
    {
      const isDouble = clientEvent.click && clientEvent.click.clickCount === 2;
      // ...
      if (isDouble || isOperator || isInteger) {
        requestType = "applyStep";
      } else {
        requestType = "previewStep";
      }
    }
    break;
  case "dblclick":
    requestType = "applyStep";
    break;
  // ...
}
```

**Observations:**
- `clickCount === 2` triggers `applyStep` (same as double-click intent)
- `case "dblclick"` exists but is redundant with clickCount check
- Single click on operator/integer → applyStep (NOT previewStep)

---

### 3. Old EngineAdapter (display-engine-pipeline)
**File:** `viewer/display-engine-pipeline/src/engine-adapter/EngineAdapter.ts`

```typescript
// Line 68: Same pattern
requestType = clientEvent.click?.clickCount === 2 ? "applyStep" : "previewStep";
```

**Observation:** Older TypeScript version has same double-click-means-apply model.

---

## DoubleClick Search Results

**Query:** `doubleclick|dblclick` in viewer/

**Results:** NO matches found in application code.

**Interpretation:** There is no explicit `dblclick` event listener or handler. The browser's synthetic `dblclick` event is never used. Instead, clickCount is checked.

---

## Current "Two-Step" Behavior

The current model is NOT single-click-then-single-click. Instead:

### For Operators (BinaryOp, Fraction, etc.)
1. **Single click** → `applyStep` request → Step applied immediately
2. No preview/confirm step

### For Integers (Num)
1. **Single click** → `applyStep` request
2. Backend returns `status: "choice"` with options
3. **User clicks popup button** → Another `applyStep` with `preferredPrimitiveId`
4. Step applied

### For Other Elements (Variables, etc.)
1. **Single click** → `previewStep` request
2. Backend returns highlights/preview
3. **Double-click (or another action)** → Would need to generate applyStep

---

## State Storage (Click Context)

**File:** `viewer/app/main.js`

```javascript
// Line 779-791: Click event handler stores context
const clickContext = {
  surfaceNodeId: ev.surfaceNodeId,
  selectionPath: /* ... */,
  surfaceOperatorIndex: ev.surfaceOperatorIndex,
};
```

**Stored in:** Local variable within callback scope, passed to `showChoicePopup`.

**No global state tracking:**
- No "last clicked node" variable
- No "selection cycle index" variable  
- No variant tracking

---

## Key Gaps for P1 Implementation

| Gap | Description | Required Change |
|-----|-------------|-----------------|
| No variant index | No state for "which variant of this node am I on" | Need to add variantIndex state |
| No cycle-on-click | Single click immediately requests backend | Need to cycle locally first |
| No double-click detection | clickCount checked but not used for modal change | Need double-click → apply |
| No local selection variants | Surface map doesn't know about primitives | Backend must provide variants on first click |

---

## Proposed New Model (Summary for P1)

```
Single Click (1st time on node):
  → Request backend for selection variants
  → Store variants in local state
  → Highlight variant[0]

Single Click (same node, already selected):
  → Cycle variantIndex locally
  → Highlight variant[variantIndex % count]
  → NO backend call

Double Click:
  → Send applyStep with selectionVariantId = current variant
  → Backend applies step
```
