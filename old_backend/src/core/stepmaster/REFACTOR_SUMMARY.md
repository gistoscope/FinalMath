# StepMaster Refactoring Summary

## Objective

The goal of this refactoring was to decompose the monolithic `StepMaster` class and its helper files (`StepPolicy`, `StepHistory`) into a modular, testable, and SOLID-compliant architecture.

## Key Changes

### 1. Modular Architecture (StepMaster Engine)

The core decision-making logic has been split into small, focused components:

- **Orchestrator** (`step-master.orchestrator.ts`): Coordinates the flow. It pipes candidates through filters and delegates the final choice to a selector.
- **Filters** (`filters/`): Independent rules that remove invalid candidates.
  - `LocalityFilter`: Enforces cursor dictatorship (must match target).
  - `RepetitionFilter`: Prevents loops (must not repeat last step).
- **Selectors** (`selectors/`): Strategies for picking the best candidate from the valid list.
  - `SimpleSelector`: Picks the first available candidate (default strategy).
- **Factory** (`step-master.factory.ts`): Assembles the orchestrator with the correct configuration of filters and selectors.

### 2. Service Extraction

The supporting data services were extracted into dedicated sub-modules:

- **History** (`history/`):
  - `history.service.ts`: Handles immutable state updates for the step history.
  - `history.types.ts`: Contains pure data types.
- **Policy** (`policy/`):
  - `policy.factory.ts`: Creates configuration objects (Student vs Teacher).
  - `policy.service.ts`: The main injection point for retrieving policies.

### 3. Renaming & Standardization

- Files have been renamed to follow a consistent **kebab-case** pattern (e.g., `StepMaster.ts` -> `step-master.core.ts`).
- Types are centralized in `step-master.types.ts`.

## File Structure Comparison

| Role           | Old File         | New Location                          |
| :------------- | :--------------- | :------------------------------------ |
| **Core Logic** | `StepMaster.ts`  | `step-master.orchestrator.ts`         |
| **Wrapper**    | N/A              | `step-master.core.ts` (Maintains API) |
| **History**    | `StepHistory.ts` | `history/history.service.ts`          |
| **Policy**     | `StepPolicy.ts`  | `policy/policy.service.ts`            |
| **Filters**    | _Inline Code_    | `filters/*.filter.ts`                 |
| **Selection**  | _Inline Code_    | `selectors/*.selector.ts`             |

## Backward Compatibility

Top-level compatibility is **preserved**.

- The `StepMaster` class still exists (now in `step-master.core.ts`). Use of `inject(StepMaster)` still works.
- It acts as a **Proxy**, instantiating the new `StepMasterOrchestrator` internally to perform the work.
- `index.ts` exports have been updated to map old names to new files.

## Benefits

- **Extensibility**: Adding a new rule (e.g., "Complexity Limit") is now just adding a new `.filter.ts` file and registering it in the factory. No core code modification is needed.
- **Testability**: Each filter and selector can be unit-tested in isolation without mocking the entire history or huge input objects.
- **Clarity**: The "Orchestrator" code is linear and readable, unburdened by specific rule implementations.
