# Report 6: Proposal Skeleton for P1 Implementation

## Goal

Redesign interaction model:
- **Single click** cycles local selection variants (no backend call after first)
- **Double click** applies action via backend with selectionVariantId

---

## 1. Protocol Changes

### New Request Field
```typescript
// In OrchestratorStepRequest (step.orchestrator.ts:50-60)
interface OrchestratorStepRequest {
  // ... existing fields ...
  selectionVariantId?: string; // NEW: Which variant to apply
  requestMode?: "getVariants" | "applyVariant"; // NEW: Explicit mode
}
```

### New Response Structure (for getVariants mode)
```typescript
interface SelectionVariant {
  id: string;              // Unique ID ("v0", "v1", etc.)
  primitiveId: string;     // "P.INT_TO_FRAC", "P.FRAC_ADD_SAME_DEN"
  label: string;           // "Convert to fraction"
  highlightPaths: string[]; // AST paths to highlight
  preview?: string;        // Optional preview LaTeX
}

// Response when requestMode = "getVariants"
interface VariantsResponse {
  status: "variants";
  variants: SelectionVariant[];
  targetNodePath: string;  // The node being acted on
}
```

---

## 2. Viewer Changes

### 2.1 State Management
**File to modify:** `viewer/app/main.js`

```javascript
// NEW: Global state for selection variants
let currentSelectionState = {
  nodeId: null,          // surfaceNodeId of selected node
  variants: [],          // Array of SelectionVariant from backend
  variantIndex: 0,       // Current variant being shown
  targetPath: null,      // AST path of target node
};
```

### 2.2 Single Click Handler
**File to modify:** `viewer/app/main.js` (around line 779)

```javascript
// NEW: Single click logic
handleSingleClick(event) {
  const nodeId = event.surfaceNodeId;
  
  if (currentSelectionState.nodeId === nodeId) {
    // Same node clicked again → cycle variants locally
    currentSelectionState.variantIndex = 
      (currentSelectionState.variantIndex + 1) % currentSelectionState.variants.length;
    highlightCurrentVariant(); // Local only, no backend call
  } else {
    // Different node → fetch variants from backend
    currentSelectionState.nodeId = nodeId;
    currentSelectionState.variantIndex = 0;
    fetchVariants(event); // Backend call
  }
}
```

### 2.3 Double Click Handler
**File to modify:** `viewer/app/engine-adapter.js` (toEngineRequest, line 170)

```javascript
// Modify to detect double-click explicitly
case "dblclick":
case "click":
  if (clientEvent.click?.clickCount === 2) {
    // Double click → apply current variant
    requestType = "applyVariant";
    clientEvent.selectionVariantId = currentSelectionState.variants[currentSelectionState.variantIndex]?.id;
  } else {
    // Single click → get/cycle variants
    requestType = "getVariants";
  }
  break;
```

### 2.4 Highlight Rendering
**File to modify:** `viewer/app/main.js`

```javascript
function highlightCurrentVariant() {
  const variant = currentSelectionState.variants[currentSelectionState.variantIndex];
  if (!variant) return;
  
  // Clear previous highlights
  clearHighlights();
  
  // Apply new highlights based on variant.highlightPaths
  variant.highlightPaths.forEach(path => highlightPath(path));
  
  // Show tooltip with variant.label
  showVariantTooltip(variant.label);
}
```

---

## 3. Backend Changes

### 3.1 Orchestrator Mode Handling
**File to modify:** `step.orchestrator.ts` (runOrchestratorStep, line 82+)

```typescript
// NEW: Handle getVariants mode
if (req.requestMode === "getVariants") {
  const variants = generateVariantsForNode(ast, req.selectionPath, ctx);
  return {
    status: "variants",
    variants,
    targetNodePath: req.selectionPath,
    history,
    engineResult: null,
  };
}

// NEW: Handle applyVariant mode
if (req.requestMode === "applyVariant" && req.selectionVariantId) {
  const variant = resolveVariant(req.selectionVariantId, ctx);
  if (!variant) {
    return { status: "engine-error", ... };
  }
  // Apply the specific primitive
  return executeVariant(variant, ast, req, ctx);
}
```

### 3.2 Variant Generation
**File to modify:** `step.orchestrator.ts` (new function)

```typescript
function generateVariantsForNode(
  ast: AstNode,
  selectionPath: string,
  ctx: OrchestratorContext
): SelectionVariant[] {
  const node = getNodeAt(ast, selectionPath);
  const variants: SelectionVariant[] = [];
  
  if (node.type === "integer") {
    variants.push({
      id: "v0",
      primitiveId: "P.INT_TO_FRAC",
      label: "Convert to fraction",
      highlightPaths: [selectionPath],
    });
  }
  
  if (node.type === "binaryOp") {
    // Add applicable primitives for this operator
    const matchedPrimitives = ctx.primitiveMaster.matchPrimitives(node);
    matchedPrimitives.forEach((p, i) => {
      variants.push({
        id: `v${i}`,
        primitiveId: p.id,
        label: p.label,
        highlightPaths: p.affectedPaths,
      });
    });
  }
  
  return variants;
}
```

### 3.3 Variant Resolution
**File to modify:** `step.orchestrator.ts` (new function)

```typescript
function resolveVariant(
  variantId: string,
  ctx: OrchestratorContext
): { primitiveId: string; targetPath: string } | null {
  // Variants would need to be cached or reconstructed
  // Option 1: Session-based cache
  // Option 2: Encode info in variantId (e.g., "P.INT_TO_FRAC@term[0]")
  
  const parts = variantId.split("@");
  return {
    primitiveId: parts[0],
    targetPath: parts[1] || "root"
  };
}
```

---

## 4. Test Requirements

### Backend Tests

**File:** `tests/P1-variant-selection.test.ts` (new)

```typescript
describe("P1 Variant Selection", () => {
  it("getVariants returns variants for integer node", async () => {
    const result = await handlePostOrchestratorStepV5({
      sessionId: "test",
      expressionLatex: "5",
      selectionPath: "root",
      requestMode: "getVariants"
    }, deps);
    
    expect(result.status).toBe("variants");
    expect(result.variants.length).toBeGreaterThan(0);
    expect(result.variants[0].primitiveId).toBe("P.INT_TO_FRAC");
  });
  
  it("applyVariant executes specific primitive", async () => {
    const result = await handlePostOrchestratorStepV5({
      sessionId: "test",
      expressionLatex: "5",
      selectionPath: "root",
      selectionVariantId: "P.INT_TO_FRAC@root",
      requestMode: "applyVariant"
    }, deps);
    
    expect(result.status).toBe("step-applied");
    expect(result.engineResult.newExpressionLatex).toMatch(/frac.*5.*1/);
  });
});
```

### Viewer Smoke Tests

**Manual test script:**
```
1. Load viewer with expression "2+3"
2. Single-click on "2" → Should see highlight and tooltip
3. Single-click on "2" again → Should cycle to next variant (if any)
4. Double-click on "2" → Should apply current variant
5. Verify expression updates correctly
```

**Programmatic test (Playwright/Puppeteer):**

```javascript
test('P1: single click cycles variants', async ({ page }) => {
  await page.goto('http://localhost:8000');
  await page.fill('#latex-input', '2+3');
  
  // First click
  await page.click('.katex-html .num-0');
  await expect(page.locator('.variant-tooltip')).toBeVisible();
  
  // Second click (cycle)
  await page.click('.katex-html .num-0');
  // Verify tooltip changed or cycled
  
  // Double click (apply)
  await page.dblclick('.katex-html .num-0');
  await expect(page.locator('#formula-container')).toContainText('frac');
});
```

---

## 5. File Reference Summary

| Component | File | Changes |
|-----------|------|---------|
| State mgmt | `main.js` | Add currentSelectionState, handleSingleClick |
| Request mapping | `engine-adapter.js:170` | Add requestMode detection |
| Highlight | `main.js` | Add highlightCurrentVariant() |
| Protocol types | `step.orchestrator.ts:50` | Add selectionVariantId, requestMode |
| Variant generation | `step.orchestrator.ts` (new) | generateVariantsForNode() |
| Handler | `HandlerPostOrchestratorStepV5.ts:68` | Parse new fields |
| Tests | `tests/P1-variant-selection.test.ts` (new) | Unit tests |

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| State desync | Reset state on expression change |
| Variant cache stale | Include expression hash in variant IDs |
| Performance | Cache variants in session briefly |
| Backward compat | Keep old choice flow as fallback |
