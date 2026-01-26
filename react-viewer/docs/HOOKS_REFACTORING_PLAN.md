# Hooks Refactoring & Modernization Plan

This document outlines the strategy for refactoring the legacy React hooks in `src/hooks` into the modern, service-oriented architecture defined in `src/new_app`.

---

## 1. Objectives

- **Decouple Logic from UI**: Move business and math logic from React lifecycle (`useEffect`) into testable Domain Services.
- **Eliminate Legacy State**: Replace all direct mutations of `appState`, `dragState`, and `selectionState` with calls to the DI-managed `StoreService`.
- **Remove Direct DOM Manipulation**: Eliminate `document.getElementById` and manual style assignments by using declarative React state.
- **Standardize Event Orchestration**: Move event bus subscriptions from hooks to feature-level "Bridges."

---

## 2. Target Architecture (Phase-by-Phase)

### Phase 1: Interaction & Gestures (`useFormulaInteraction`)

Move complex pointer-event processing to the Domain layer.

- **New File**: `src/new_app/domain/interaction/GestureCalculator.ts`
  - Responsibilities: Drag rectangle calculations, hit-test coordination, distance thresholding.
- **Service Update**: `InteractionService`
  - Logic: Orchestrate between hit-testing and the selection domain.
- **Refactored Hook**: `useInteraction` (Slim wrapper)
  - Role: Browser event listeners -> Service method calls.

### Phase 2: Engine Lifecycle (`useEngine` & `useTsaEngine`)

Automate the synchronization between the Engine and the State without manual hook subscriptions.

- **Service Update**: `EngineBridge`
  - Logic: Handle `ClientEvent`, `EngineRequest`, and `EngineResponse` messages.
  - Integration: Directly update `StoreService` when the backend expression changes.
- **Deleted Hooks**: `useEngine` and `useTsaEngine` will be replaced by a single initiation call to `EngineBridge.start()` at the App root.

### Phase 3: Infrastructure & Debug (`useAppEvents`)

Separate UI actions from API and File-System utilities.

- **New Client**: `src/new_app/core/api/clients/DebugClient.ts`
  - Logic: `fetch` snapshots, session resets, and history retrieval.
- **New Utility**: `src/new_app/utils/FileExportUtils.ts`
  - Logic: Blobs, URLs, and browser "a" tag download triggers.
- **Store Support**: Move test selection and LaTeX loading logic into `StoreService`.

---

## 3. Proposed Folder Structure

```text
src/new_app/
├── core/
│   └── api/
│       └── clients/
│           ├── OrchestratorClient.ts (Existing)
│           ├── IntrospectClient.ts   (Existing)
│           └── DebugClient.ts        [NEW] -> Moved from useAppEvents
├── domain/
│   ├── interaction/
│   │   ├── InteractionService.ts     (Existing)
│   │   └── GestureProcessor.ts       [NEW] -> Moved from useFormulaInteraction
│   └── math/
│       └── engine/
│           └── MathEngine.ts         (Expanded) -> Absorbs useMathInstrumentation
├── features/
│   ├── engine-bridge/
│   │   └── EngineBridge.ts           (Expanded) -> Absorbs useEngine & useTsaEngine
│   └── exporting/
│       └── ExportService.ts          [NEW] -> Handles JSON/Snapshot downloads
└── hooks/                            [REFACTORED]
    ├── useInteraction.ts              (Slim)
    ├── useService.ts                  (Existing)
    └── useAppActions.ts               (Unified Action Connector)
```

---

## 4. Migration Mapping

| Hook                     | Logic Moved To                            | Type           |
| :----------------------- | :---------------------------------------- | :------------- |
| `useFormulaInteraction`  | `InteractionService` + `GestureProcessor` | Domain         |
| `useAppEvents`           | `DebugClient` + `ExportService`           | Infrastructure |
| `useEngine`              | `EngineBridge`                            | Feature        |
| `useTsaEngine`           | `EngineBridge`                            | Feature        |
| `useMathInstrumentation` | `MathEngine`                              | Domain         |

---

## 5. Implementation Example (Conceptual)

### Before (Hook-heavy)

```typescript
// useFormulaInteraction.ts (Legacy)
useEffect(() => {
  const handleMove = (e) => {
    if (isDragging) {
      const rect = document.getElementById('drag-rect'); // DOM Access
      rect.style.left = ...; // Mutation
      appState.current.selection = ...; // Legacy Global
    }
  }
}, []);
```

### After (Service-driven)

```typescript
// InteractionService.ts (Modern)
public handleMove(coords: Point) {
  if (this.gesture.isDragging(coords)) {
     const bbox = this.gesture.calculateDragBox(coords);
     this.store.updateDrag({ currentBox: bbox }); // Reactive State
  }
}

// useInteraction.ts (Refactored)
const interaction = useService(Tokens.IInteractionService);
return {
  onPointerMove: (e) => interaction.handleMove({ x: e.clientX, y: e.clientY })
};
```

---

## 6. Verification Plan

1. **Service Unit Tests**: Test coordinates -> hit-test logic without React.
2. **Side-by-Side Validation**: Ensure legacy `appState` and new `StoreService` values align during the transition.
3. **Clean Build**: Ensure no legacy hook imports remain in the UI components (`FormulaViewer`, `Toolbar`).
