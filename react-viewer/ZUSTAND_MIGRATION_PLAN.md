# Zustand Migration Plan: react-viewer

This plan outlines the step-by-step process for migrating the `react-viewer` application from its current fragmented state management (Context + Global Objects) to a unified **Zustand** store.

## Phase 1: Foundation (Setup)

### 1.1 Install Dependencies

```bash
pnpm add zustand
```

### 1.2 Create Store Directory

Create a dedicated directory for the store:

- `src/store/useViewerStore.ts`

### 1.3 Map Existing Types

Reference `src/types/viewer-state.ts` to define the store interface. We will combine `ViewerState` with the actions currently in `ViewerContext.tsx`.

---

## Phase 2: UI State Migration (Context Replacement)

### 2.1 Create the Unified Store

Implement the store using `create` from Zustand.

- Port `initialState` from `ViewerContext.tsx`.
- Convert `viewerReducer` logic into direct state-mutating actions using `set`.

### 2.2 Update Component Entry Point

In `src/App.tsx`:

- Remove `ViewerProvider`.
- Replace `useViewer()` calls with specific store selectors (e.g., `const latex = useViewerStore(s => s.formula.latex)`).

### 2.3 Incremental Component Updates

Update leaves first:

- `JsonInspector.tsx`
- `ControlToolbar.tsx`
- `ManualLatexInput.tsx`

---

## Phase 3: Engine State Migration (Global Objects)

### 3.1 Integrate `app/core/state.ts`

This is the most critical step. We will move the mutable objects into the store to allow React to react to engine changes.

- Move `selectionState`, `dragState`, and `integerCycleState` into the store.
- Create actions for `updateSelection`, `setDragging`, etc.

### 3.2 Update Non-React Logic

Modify `app/core/state.ts` to act as a bridge:

- Instead of `export const appState = { ... }`, export helper functions that call `useViewerStore.getState()`.
- This allows the Engine to update the store without being a React component.

---

## Phase 4: Hook Refactoring

### 4.1 Refactor `useFormulaInteraction.ts`

- Remove all `(appState as any)` casts.
- Use `useViewerStore` actions to handle drag and selection events directly.

### 4.2 Refactor `useEngine.ts`

- Update the `setEngineResponseCallbacks` to dispatch actions to the store directly instead of relying on the context's `actions.setLatex`.

---

## Phase 5: Cleanup & Polish

### 5.1 Remove Legacy Files

- Delete `src/context/ViewerContext.tsx`.
- Clean up or remove `src/app/core/state.ts` once all values are migrated to the store.

### 5.2 Add Middleware

- Enable `devtools` middleware for easier debugging.
- (Optional) Use `persist` middleware for the `logs` or `activeTestId` if session persistence is desired.

---

## Verification Checklist

- [ ] App launches without `ViewerProvider` error.
- [ ] Changing a test in `TestSelector` updates the `FormulaViewer`.
- [ ] Drag-selecting on the formula updates the selection state.
- [ ] `JsonInspector` updates in real-time when the surface map is built.
- [ ] No `any` casts remain in state-related code.
