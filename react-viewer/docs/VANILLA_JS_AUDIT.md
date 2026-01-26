# Vanilla JS to React Audit - Phase 4

This document identifies areas where Vanilla JS patterns (manual DOM manipulation, global event listeners, and ID-dependent logic) persist in the `react-viewer` project and provides recommendations for alignment with React best practices.

## Summary of Findings

The project retains a significant amount of logic from its pure Vanilla JS origins. While some of this is isolated in "utility" modules, much of it directly manipulates the DOM, bypassing React's reconciliation process. This leads to:

1.  **State Mismatches**: React doesn't know when the DOM has been changed by external scripts.
2.  **Cleanup Issues**: Direct `addEventListener` calls on `document` or `window` may not be cleaned up when components unmount.
3.  **Ref Inconsistency**: Using `document.getElementById` instead of React `refs` makes components less reusable and harder to test.

---

## 1. Direct DOM Manipulation & Appendage

Several modules manually create and append elements to `document.body` or other containers.

| File                              | Pattern                                | Issue                                           | Recommended Action                                                             |
| :-------------------------------- | :------------------------------------- | :---------------------------------------------- | :----------------------------------------------------------------------------- |
| `src/app/ui/choice-popup.ts`      | `document.body.appendChild(popup)`     | Bypasses React. Hard to style with CSS modules. | Convert to a React Component using a Portal.                                   |
| `src/app/ui/diagnostics-panel.ts` | `document.body.appendChild(panel)`     | Bypasses React.                                 | Convert to a React Component.                                                  |
| `src/app/ui/hint-indicator.ts`    | `document.body.appendChild(indicator)` | Bypasses React.                                 | Convert to a React Component.                                                  |
| `src/app/ui/selection-overlay.ts` | `appendChild`, `innerHTML = ""`        | Manages selection visuals manually.             | Move visual rendering into `FormulaViewer` or a child React component.         |
| `src/app/introspect/*`            | Extensive use of `innerHTML`           | The entire introspection module is vanilla.     | This module should ideally be rewritten as a set of React components or hooks. |

## 2. Global Event Listeners

Manual event listeners that may leak if not carefully managed.

| File                                   | Pattern                                   | Issue                                 | Recommended Action                                                                                     |
| :------------------------------------- | :---------------------------------------- | :------------------------------------ | :----------------------------------------------------------------------------------------------------- |
| `src/hooks/useFormulaInteraction.ts`   | `container.addEventListener(...)`         | Direct attachment to a ref's element. | While common in complex interaction hooks, ensure full cleanup in `useEffect` (currently mostly done). |
| `src/app/ui/choice-popup.ts`           | `document.addEventListener("click", ...)` | Potential leaks.                      | Use a standard React "click outside" hook.                                                             |
| `src/app/introspect/IntrospectPage.ts` | `btn.addEventListener("click", ...)`      | Manual binding to pre-existing HTML.  | Use React `onClick` props on the buttons.                                                              |

## 3. ID Dependencies

Critical logic depends on specific IDs existing in the DOM, which is fragile in React.

| File                                                | ID Dependency       | Context                     | Recommended Action                                                     |
| :-------------------------------------------------- | :------------------ | :-------------------------- | :--------------------------------------------------------------------- |
| `src/app/features/selection/selection-manager.ts`   | `selection-overlay` | Clearing selection visuals. | Pass the overlay element or a ref to the function instead of querying. |
| `src/app/ui/choice-popup.ts`                        | `formula-container` | Position calculation.       | Pass the reference element from the event or a hook.                   |
| `src/app/features/rendering/surface-map-builder.ts` | `formula-container` | Fallback for container.     | Always require the container to be passed in.                          |

## 4. CSS Classes for State

The app uses CSS classes like `.p1-integer-selected` applied directly via `classList.add` to signify state.

- **Logic**: `selection-manager.ts` queries `.p1-integer-selected` to clear it.
- **React Alternative**: State should drive class application. Components (like a refined `FormulaNode`) should determine their classes based on the global `selectionState`.

---

## Proposed Refactoring Roadmap

### Step A: Portals for floating UI (Priority: High)

Move `ChoicePopup`, `HintIndicator`, and `DiagnosticsPanel` from vanilla append-to-body to React Portals.

- **Goal**: Allow these UIs to be driven by React state while appearing at the top level of the DOM.

### Step B: Reactify the Selection Overlay (Priority: Medium)

Re-implement the SVG/Canvas overlay in `selection-overlay.ts` as a React component that renders based on `selectionState` and `operatorSelectionState`.

- **Benefit**: Automatic re-renders when selection changes, eliminating manual `innerHTML = ""` calls.

### Step C: Decouple Introspect Module (Priority: Low)

The Introspect module is useful for debugging but its vanilla nature makes it hard to integrate.

- **Goal**: Create a React-based `IntrospectView` that uses the same logic but renders via JSX.

### Step D: Eliminate `document.getElementById` (Priority: Ongoing)

Standardize on passed `refs` or `Context` for referencing common containers like the formula host.
