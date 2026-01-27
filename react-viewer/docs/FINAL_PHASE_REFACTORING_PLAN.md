# Final Phase: UI Integration & Legacy Cleanup Plan

This plan outlines the final steps required to complete the transition from the legacy codebase to the modern `new_app` architecture.

---

## Part 1: Feature Migration (P1 & Diagnostics) ✅ COMPLETED

The P1 domain contains the most complex "Expert System" logic (prime factoring, fraction cycles, automated tests).

1. **`P1Service` (New Feature Service)**: ✅
   - Location: `src/new_app/features/p1/P1Service.ts`
   - Logic:
     - Prime factoring coordination.
     - Fraction conversion logic.
     - Status diagnostics (mapping between backend status codes and UI indicators).
   - Source: `src/app/features/p1/hint-actions.ts` & `integer-click-handler.ts`.

2. **`IntegerCycleManager` (New Domain Helper)**: ✅
   - Location: `src/new_app/domain/interaction/IntegerCycleManager.ts`
   - Logic: State machine for cycling through available math primitives (Integer -> Fraction -> Primes).
   - Source: `src/app/features/p1/HintCycle.ts`.

3. **`TestRunnerService`**: ✅
   - Location: `src/new_app/features/testing/TestRunnerService.ts`
   - Role: Automate expression loading and verification for the "Test View."
   - Source: `src/app/features/p1/tests.ts`.

---

## Part 2: Total Debugger Migration ✅ COMPLETED

Move remaining investigative API calls to the modern infrastructure.

1. **`DebugClient` Expansion**: ✅
   - Add `fetchAstDebug`, `fetchMapDebug`, and `resolvePath` methods to `src/new_app/core/api/clients/DebugClient.ts`.
   - Goal: Fully replace `src/app/core/Debugger.ts`.

2. **`TraceRecorder` Integration**: ✅
   - Wire the `TraceRecorder` into the `EngineBridge` so it captures all messages without manual triggers from the UI.

---

## Part 3: UI Component Wiring (The "Switch-Over") ✅ COMPLETED

Connect the existing views to the new dependency injection (DI) container.

1. **`FormulaViewer.tsx`**: ✅
   - Replace manual `EventListener` logic with the `useInteraction` hook.
   - Inject `InteractionService` for click/drag handling.

2. **`ControlToolbar.tsx`**: ✅
   - Replace legacy `handleDownload...` callbacks with imports from the `useAppActions` hook.

3. **`App.tsx`**: ✅
   - Initialize the `EngineBridge` and `setupDIContainer()` at the root level.
   - Remove the `useEffect` blocks that manually subscribe to the `FileBus`.

---

## Part 4: Legacy Deletion & Cleanup ✅ COMPLETED

Once all components are verified using the modern services, perform a "Burn the Ships" cleanup.

1. **Delete `src/app/`**: ✅
   - Ensure `constants.ts` and `state.ts` are migrated if still needed.
   - Files deleted: `src/app/*`.

2. **Delete `src/hooks/` (Legacy)**: ✅
   - Ensure `useEngine`, `useFormulaInteraction` are gone.
   - Files deleted: `src/hooks/*`.

3. **Delete Unused Slices**: ✅
   - Any Redux-like slices or contexts not ported to `store/` are removed.

---

## Timeline (Estimated)

- **Step 1 (P1 Migration)**: 2-3 development sessions (High Complexity).
- **Step 2 (Debugger & Tracing)**: 1 development session (Medium Complexity).
- **Step 3 (UI Wiring)**: 1 development session (Visual Verification needed).
- **Step 4 (Cleanup)**: Final polish and deletion.
