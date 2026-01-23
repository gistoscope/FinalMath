# SOLID Principles Audit Report

## Executive Summary

The `viewer` project demonstrates a mix of good modularity and significant architectural debt. While some areas like the `surface-map` module show clear separation of concerns, the core application logic suffers from "God Object" patterns and tight coupling, particularly in state management and debugging tools.

## Detailed Analysis

### 1. Single Responsibility Principle (SRP)

**Status: ⚠️ Mixed / Violation**

- **Good:** `src/app/surface-map/element-classifier.js` has a single, well-defined responsibility: classifying DOM nodes based on classes/text.
- **Good:** `src/app/features/*` attempts to group logic by feature (events, rendering, p1).
- **VIOLATION:** `src/app/debug-tool.js` (55KB+) is a massive "God Module". It handles:
  - DOM querying and manipulation.
  - Event listener binding.
  - API client (fetch calls).
  - Business logic (AST traversal).
  - UI State management.
- **VIOLATION:** `src/app/core/state.js` centralizes _all_ app state (app, selection, integer cycle, operator selection) in one file, making it a focal point for unrelated changes.

### 2. Open/Closed Principle (OCP)

**Status: ❌ Violation**

- **Issue:** The system is open for modification, but closed for extension.
- **Example 1 (`ElementClassifier`):** To add a new element type (e.g., "Matrix"), you must modify the `classify` method and inject a new `if/else` block. The class does not support registering external strategies or classifiers.
- **Example 2 (`debug-tool.js`):** Adding a new debug command requires modifying the existing initialization execution flow and adding new UI handling logic directly into the file.
- **Example 3 (`main.js`):** The orchestrator is tightly coupled to concrete imports. Adding a new feature requires modifying the main initialization sequence.

### 3. Liskov Substitution Principle (LSP)

**Status: ⚪ Neutral (JavaScript Context)**

- In a prototype-based functional codebase, this is less strictly applicable than in OOP.
- However, the `SurfaceNode` hierarchy (implicit) seems consistent. Nodes created by the factory appear to share a common "interface" (properties like `id`, `kind`, `role`).

### 4. Interface Segregation Principle (ISP)

**Status: ✅ Good**

- The usage of `index.js` files in `src/app/features/*` effectively creates "module interfaces".
- Consumers verify specific functions (e.g., `import { renderFormula } from ...`) rather than importing entire massive objects.
- **Events Module:** Segregates handlers into `button-handlers.js`, `container-events.js`, etc., allowing the consumer to only attaching the listeners they need.

### 5. Dependency Inversion Principle (DIP)

**Status: ❌ Violation**

- **Issue:** High-level policy modules depend directly on low-level detail modules.
- **Example:** `main.js` (High Level) imports concrete functions from `rendering`, `events`, and `engine` directly. There is no abstraction layer or dependency injection container.
- **Consequence:** It is impossible to swap out the `renderFormula` (KaTeX) implementation for another renderer (e.g., MathJax) without rewriting `main.js` and every feature module that imports it.
- **State Dependency:** Almost all modules depend directly on the concrete singleton objects in `core/state.js`, making unit testing in isolation extremely difficult.

## Recommendations

1.  **Refactor `debug-tool.js`**: Split into `DebugAPIClient`, `DebugUIController`, and `DebugASTService`.
2.  **Strategy Pattern for Classifier**: Refactor `ElementClassifier` to accept an array of `ClassificationStrategy` objects, allowing new rules to be added without touching the core class.
3.  **Dependency Injection**: Use a simple IOC container or pass dependencies (like `fileBus` or `renderFormula`) into feature factories instead of having them import global singletons.
4.  **State Management**: As suggested in the React migration plan, move from a global mutable state singleton to a managed state store (Redux/Zustand) where components "subscribe" to state slices.
