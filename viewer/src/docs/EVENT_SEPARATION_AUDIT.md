# Event Separation Audit Report

## Executive Summary

The `viewer` project implements a **physical separation** of event listeners into the `src/app/features/events` directory, but fails to achieve **logical separation**. Event handlers frequently contain complex business logic, direct DOM manipulation, and state mutation, violating the "Separation of Concerns" principle.

## Detailed Findings

### 1. Physical Separation

**Status: ✅ Good**

- Global window/document events are isolated in `global-events.js`.
- Container interactions (pointer/drag) are in `container-events.js`.
- UI controls are in `button-handlers.js`.
- `main.js` cleanly delegates setup to these modules on startup.

### 2. Logical Separation

**Status: ❌ Failed**

- **Embedded Business Logic:** `container-events.js` does not merely translate events into actions; it _performs_ the actions.
  - **Example:** Smart Operator Selection logic (40+ lines) is embedded directly inside the `pointerup` handler, including context creation and validation.
  - **Example:** Drag threshold calculations and "Click Outside" heuristics (measuring character width via dynamic DOM element creation) are inline within handlers.
- **Direct State Mutation:** Handlers directly import and mutate `appState` and `selectionState`, acting as both View and Controller.
- **API Calls in Handlers:** `button-handlers.js` contains direct `fetch()` calls for downloading snapshots/sessions, mixing UI handling with network transport.

### 3. Hidden Event Listeners

**Status: ⚠️ Warning**

- **`debug-tool.js`**: This "God Module" manages its own event listeners for the debug panel (`btnAstDebug`, `btnMapDebug`, etc.) internally, completely bypassing the structured events module. This creates a split "event architecture" where some events are managed centrally and others are hidden in feature implementations.

## Recommendations

1.  **Refactor Container Events**: Move the "Smart Operator Selection" and hit-testing logic into a `InteractionController` or `SelectionService`. The event handler should only call `selectionService.handleMapClick(x, y)`.
2.  **Abstract API Calls**: Move `fetch` logic from `button-handlers.js` to `src/app/core/api.js` or a dedicated `DebugClient`.
3.  **Unify Debug Events**: Refactor `debug-tool.js` to expose an `attachListeners()` method or move its listeners into the `features/events` system for consistency.
4.  **Custom Hooks (Future React)**: As per the React migration plan, these logic-heavy handlers should become custom hooks (e.g., `useDragSelection`, `useSmartSelection`) that isolate the logic from the rendering component.
