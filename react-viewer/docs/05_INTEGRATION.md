# Step 5: Integration

This is the final significant code step. We will incorporate the logic from the legacy `main.js` into the React lifecycle within `App.tsx`.

## 1. Migration Strategy

- **Initialization Hook**: Use `useEffect(..., [])` to run the one-time setup code that was previously in `document.addEventListener("DOMContentLoaded", ...)`.
- **Import Mapping**: Map the imports from `main.js` to imports in `App.tsx`.
- **Window Globals**: Explicitly define `window.runP1SelfTest` types (or ignore TS errors) to maintain debugging capabilities.

## 2. Update `App.tsx` Logic

We will modify the `useEffect` block in `src/App.tsx` and add necessary imports.

### Action Items

1.  Open `react-viewer/src/App.tsx`.
2.  Add the imports at the top.
3.  Fill the `useEffect` body with the logic from `main.js`.

### Code to Apply

Update your `App.tsx` to include the logic below.

#### A. Imports (Add to top of file)

```typescript
// --- Feature Imports ---
import {
  displayAdapter,
  eventRecorder,
  fileBus,
  initializeAdapters,
  setEngineResponseCallbacks,
} from "./features/engine/index.js";

import {
  runP1OrderTest,
  runP1SelfTest,
  setOnHintApplySuccess,
} from "./features/p1/index.js";

import { buildAndShowMap, renderFormula } from "./features/rendering/index.js";
import { clearSelection } from "./features/selection/index.js";

import {
  setupButtonHandlers,
  setupContainerEvents,
  setupGlobalEvents,
} from "./features/events/index.js";

import { DebugController, setupDebugPanel } from "./features/debug/index.js";
import "./features/trace-hub/index.js"; // Side-effect import

// --- Global Types (Optional helper for TypeScript) ---
declare global {
  interface Window {
    runP1SelfTest: () => void;
    runP1OrderTest: (order: number) => void;
    __v5EndpointUrl?: string; // If used
    katex: any;
  }
}
```

#### B. Logic (Replace `useEffect`)

```typescript
useEffect(() => {
  // 1. Initialize Adapters
  initializeAdapters();

  // 2. Expose Test Functions to Window
  window.runP1SelfTest = () => runP1SelfTest(renderFormula, buildAndShowMap);
  window.runP1OrderTest = (order: number) =>
    runP1OrderTest(order, renderFormula, buildAndShowMap);

  // 3. Define Callbacks
  const onHintApplySuccess = (newLatex: string) => {
    renderFormula();
    buildAndShowMap();
    clearSelection("latex-changed");
  };

  // 4. Register Callbacks
  setOnHintApplySuccess(onHintApplySuccess);
  setEngineResponseCallbacks(renderFormula, buildAndShowMap, clearSelection);

  // 5. Main Initialization (formerly DOMContentLoaded)
  // Initial render
  const container = renderFormula();
  buildAndShowMap();

  // Setup button handlers
  setupButtonHandlers({
    renderFormula,
    buildAndShowMap,
    eventRecorder,
    fileBus,
  });

  // Setup global events
  setupGlobalEvents(renderFormula, buildAndShowMap);

  // Setup debug panel
  setupDebugPanel(fileBus);
  DebugController.init();

  // Setup container events
  // Note: We are using document.getElementById inside renderFormula, so 'container' is the DOM element.
  if (container) {
    setupContainerEvents(container, displayAdapter);
  }

  console.info("[React] App initialized via migrated logic");

  // Cleanup (Optional but good practice)
  return () => {
    // If the legacy code had cleanup functions, we would call them here.
    // For now, we leave it empty as the original app didn't seemingly destroy itself.
  };
}, []);
```

## 3. Verification

1.  **Check Terminal**: Ensure Vite is running without errors.
2.  **Check Browser**:
    - Reload the page.
    - Do you see a formula rendered? (e.g., `2+2=4` or similar default).
    - **Interact**: Hover over numbers. Do you see the "Hover debug" panel update?
    - **Buttons**: Click "Test: T1 · Simple fractions" -> "Rebuild map". Does the formula change?

If all of the above work, the migration is functionally complete!
