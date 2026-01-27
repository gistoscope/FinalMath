# MASTER REFACTORING PLAN: tsyringe & SOLID Migration

This document combines the core architecture plan with the extended domain migration strategy for the **`new_app`** refactor.

---

## 1. Objectives

- **Decoupling**: Separate infrastructure (API, Bus, Store) from business rules.
- **Testability**: Enable true unit testing by injecting mocks for dependencies.
- **SOLID Compliance**: Adhere to Single Responsibility, Open/Closed, and Dependency Inversion principles.
- **Maintainability**: Standardize how the UI interacts with the math engine via a clean Service Layer.

---

## 2. Updated Folder Structure (`src/new_app/`)

```bash
src/new_app/
├── di/                          # Dependency Injection Setup
│   ├── tokens.ts                # Injection Tokens (Strings/Symbols)
│   └── container.ts             # Container Registration logic
├── core/                        # Cross-cutting Infrastructure
│   ├── api/                     # API Gateway (HTTP/Websockets)
│   │   └── clients/             # OrchestratorClient, IntrospectClient
│   ├── bus/                     # Internal Messaging (FileBus)
│   └── logging/                 # Diagnostics & Error Tracking
├── store/                       # The "Bridge" to Reactive State
│   ├── interfaces/              # IStoreService
│   └── StoreService.ts          # Centralized Zustand access
├── domain/                      # PURE Business Logic (Classes)
│   ├── math/                    # Math Engine (The Brain)
│   │   ├── parser/              # LaTeX Tokenization & Parsing
│   │   ├── instrumentation/     # Metadata (Stable IDs) injection
│   │   └── engine/              # Main Math lifecycle logic
│   ├── surface-map/             # DOM-to-Math mapping logic
│   │   ├── builders/            # KaTeX-specific traversal
│   │   └── providers/           # Geometry & Classification helpers
│   └── selection/               # Interactive state management
│       └── models/              # SelectionContext, BBox models
├── features/                    # Feature-specific Orchestrators
│   ├── engine-bridge/           # Connection between Domain and Backend
│   ├── introspection/           # Formula metadata visualization
│   └── trace-hub/               # Recording & Debugging tools
└── utils/                       # pure side-effect-free helpers
```

---

## 3. Module Re-Mapping (Old -> New)

| Old Path              | New Domain/Feature         | Description                                     |
| :-------------------- | :------------------------- | :---------------------------------------------- |
| `app/ast-parser/`     | `domain/math/parser/`      | LaTeX -> AST logic.                             |
| `app/surface-map/`    | `domain/math/surface-map/` | KaTeX HTML -> SurfaceNode mapping.              |
| `app/core/FileBus.ts` | `core/bus/FileBus.ts`      | Event-driven bridge.                            |
| `app/client/`         | `core/api/clients/`        | External API clients.                           |
| `app/introspect/`     | `features/introspection/`  | Metadata rendering feature.                     |
| `app/core/state.ts`   | `store/StoreService.ts`    | State logic now moved to an injectable service. |

---

## 4. SOLID Strategy Implementation

### 4.1 Single Responsibility (SRP)

- **Surface Mapping**: Split `SurfaceMapBuilder` into a `Traverser` (DOM walking), `Classifier` (Identifying symbols), and `GeometryProvider` (Coordinate math).
- **Math Parsing**: Separate the `Tokenizer` (Raw text) from the `Parser` (Structural tree).

### 4.2 Open/Closed (OCP)

- **Enhancer Pipeline**: Use an `EnhancerRegistry` to allow adding new post-processing steps (like `StableId` or `Coloring`) without modifying the primary map builder.
- **Client Strategies**: Support multiple backend versions (V5, P5) by injecting different `IApiClient` implementations.

### 4.3 Dependency Inversion (DIP)

- **Store Access**: Components and Services depend on `IStoreService` (Interface), not the concrete `useViewerStore` hook.
- **API**: Logical services depend on `IApiClient` tokens, allowing them to run in a "Mock Mode" for testing.

---

## 5. Migration Roadmap

### Phase 1: Foundation (Current)

1.  **DI Setup**: Register all base tokens and interfaces.
2.  **Infrastructure**: Migrate `FileBus` and `Logger` to `core/`.
3.  **The Bridge**: Implement `StoreService` to wrap the existing Zustand store.

### Phase 2: Domain Logic (High Priority)

1.  **Math Parser**: Port `Parser.ts` and `Tokenizer.ts` to `domain/math/`.
2.  **Surface Map**: Port the builder logic using the new injectable providers.
3.  **Selection**: Port `OperatorSelectionContext` and selection logic.

### Phase 3: Integration & UI

1.  **Engine Bridge**: Migrate the logic that connects `FileBus` to the Backend API.
2.  **Hooks Update**: Create a `useService()` hook to allow React components to resolve these new classes.
3.  **Cleanup**: Gradually remove the old `app/*` files once verification is complete.

---

## 6. Verification Plan

- **Unit Tests**: Create tests for `domain/math` and `domain/surface-map` using mocked dependencies.
- **Visual Check**: Verify that formula interaction (highlighting, selection) remains pixel-perfect during the transition.
