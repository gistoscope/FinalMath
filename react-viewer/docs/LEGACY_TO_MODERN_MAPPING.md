# Legacy to Modern Code Mapping Report

This report provides a comprehensive mapping between the legacy codebase (located in `src/app`, `src/assets`, `src/components`, and `src/hooks`) and the modern architecture implemented in `src/new_app`.

---

## 1. Core Architecture Comparison

| Feature              | Legacy Path (`src/app/core`) | Modern Path (`src/new_app/core`)  | Status           |
| :------------------- | :--------------------------- | :-------------------------------- | :--------------- |
| **State Management** | `state.ts` (Global Objects)  | `src/store/` (Zustand + Immer)    | **Migrated**     |
| **Event Bus**        | `FileBus.ts`                 | `bus/FileBus.ts`                  | **Migrated**     |
| **API Client**       | `ApiClient.ts`, `api.ts`     | `api/base/BaseApiClient.ts`       | **Migrated**     |
| **API Features**     | Mixed in `core/`             | `api/clients/` (Specific Clients) | **Migrated**     |
| **Logging**          | `Logger.ts`                  | `logging/Logger.ts`               | **Migrated**     |
| **Constants**        | `constants.ts`               | `src/app/core/constants.ts`       | **Pending Move** |

---

## 2. Domain & Feature Migration

### Math & AST Processing

| Legacy Path (`src/app/ast-parser`) | Modern Path (`src/new_app/domain/math`) | Status       |
| :--------------------------------- | :-------------------------------------- | :----------- |
| `Parser.ts`                        | `parser/Parser.ts`                      | **Migrated** |
| `Tokenizer.ts`                     | `parser/Tokenizer.ts`                   | **Migrated** |
| `AstTraverser.ts`                  | `parser/AstTraverser.ts`                | **Migrated** |
| `LatexInstrumenter.ts`             | `instrumentation/LatexInstrumenter.ts`  | **Migrated** |
| `index.ts` (Orchestration)         | `engine/MathEngine.ts`                  | **Migrated** |

### Surface Map Domain

| Legacy Path (`src/app/surface-map`) | Modern Path (`src/new_app/domain/surface-map`) | Status         |
| :---------------------------------- | :--------------------------------------------- | :------------- |
| `KaTeXMapBuilder.ts`                | `builders/KaTeXMapBuilder.ts`                  | **Migrated**   |
| `GeometryProvider.ts`               | `providers/GeometryProvider.ts`                | **Migrated**   |
| `element-classifier.ts`             | `providers/NodeClassifier.ts`                  | **Migrated**   |
| `surface-map-enhancer.ts`           | `SurfaceMapEngine.ts`                          | **Refactored** |

### Engine & Bridge

| Legacy Path (`src/app/features/engine`) | Modern Path (`src/new_app/features/engine-bridge`) | Status        |
| :-------------------------------------- | :------------------------------------------------- | :------------ |
| `EngineAdapter.ts`                      | Partially in `EngineBridge.ts`                     | **Migrated**  |
| `response-handler.ts`                   | `EngineBridge.ts` (State sync)                     | **Migrated**  |
| `DisplayAdapter.ts`                     | TBD (Interaction logic moved)                      | **Relocated** |

---

## 3. Hook Migration (Logic to Service)

| Legacy Hook (`src/hooks/`)  | Modern Replacement (`new_app/`)            | Status       |
| :-------------------------- | :----------------------------------------- | :----------- |
| `useFormulaInteraction.ts`  | `domain/interaction/InteractionService.ts` | **Migrated** |
| `useAppEvents.ts`           | `hooks/useAppActions.ts`                   | **Migrated** |
| `useEngine.ts`              | `features/engine-bridge/EngineBridge.ts`   | **Migrated** |
| `useTsaEngine.ts`           | `features/engine-bridge/EngineBridge.ts`   | **Migrated** |
| `useMathInstrumentation.ts` | `domain/math/engine/MathEngine.ts`         | **Migrated** |

---

## 4. Components & UI Status

The modern architecture focuses on **Logic (Domain/Features/Hooks)**. The UI components are currently in a transition state.

| Category    | Legacy Path (`src/components/`)  | Modern Strategy                             | Status      |
| :---------- | :------------------------------- | :------------------------------------------ | :---------- |
| **Viewer**  | `viewer/FormulaViewer.tsx`       | Refactor to use `useInteraction`            | **Ongoing** |
| **Console** | `console/InteractiveConsole.tsx` | Refactor to use `StoreService` logs         | **Ongoing** |
| **Toolbar** | `controls/Toolbar.tsx`           | Refactor to use `useAppActions`             | **Ongoing** |
| **Popups**  | `debug/ChoicePopup.tsx`          | Refactor to use `StoreService` choice state | **Ongoing** |

---

## 5. Asset Management

Static assets (`src/assets`) remain unchanged for now. They will be referenced by modern components using Vite's asset handling.

- **Katex (CSS/Fonts)**: Still used by the `MathViewer`.
- **Global Styles**: Legacy CSS resides in `src/assets/css`.

---

## 6. Gap Analysis & Remaining Tasks

### Missing from Modern Code:

1. **P1 Diagnostics**: Legacy logic in `src/app/features/p1` needs to be fully encapsulated in a P1 Feature Service.
2. **Trace Recording**: Legacy `src/app/core/Debugger.ts` (event recording) is only partially migrated to `TraceRecorder`.
3. **UI Polish**: The `new_app` hooks are ready, but the components are not yet fully wired to the new DI container.

### Next Steps:

1. **Wire Components**: Update `App.tsx` and main UI components to use `useService` and the new hooks.
2. **Delete Legacy Core**: Once `appState` is zeroed out, we can remove `src/app/core/state.ts`.
3. **P1 Encapsulation**: Move P1 specific click-handlers and diagnostic logic to `new_app/features/p1`.
