## 7. Bug Fix: Invariant Loading & Candidate Generation (2026-02-01)

**Status:** In Progress

### Issue Identified

1. **Invariant Loading**: Fixed an issue where `InvariantLoader` incorrectly handled JSON imports, resulting in empty rule sets. Fixed by checking for `.default` export.
2. **Zero Candidates**: Even after loading rules, `2 + 3 - 1` returns 0 candidates.
   - Logs show 5 applicable invariant rules are found for "Integers".
   - `buildCandidatesForIntegersStage1` returns 0 candidates.
   - Suspecting `primitiveIds` might be empty or `filterRulesByDomain` mismatch.
   - Added `[DEBUG]` logs to `integers.rules.ts` to trace execution.

### Next Steps

- Analyze new `[DEBUG]` logs from user to pinpoint why the integer rule loop is not producing candidates.
