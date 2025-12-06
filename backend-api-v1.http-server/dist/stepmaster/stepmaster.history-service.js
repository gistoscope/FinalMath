/**
 * Step History Service (TzV1.1)
 *
 * Responsibilities:
 *  - Maintain an immutable history of executed steps.
 *  - Provide easy access to a simple history snapshot.
 */
/**
 * Create an empty history.
 */
export function createEmptyHistory() {
    return { entries: [] };
}
/**
 * Append a step result to the history.
 * Returns a new history object (immutable).
 */
export function appendStepFromResult(history, result, expressionBefore) {
    const { decision, input } = result;
    let invariantRuleId;
    let targetPath;
    if (decision.status === "chosen" && decision.chosenCandidateId) {
        const candidate = input.candidates.find(c => c.id === decision.chosenCandidateId);
        if (candidate) {
            invariantRuleId = candidate.invariantRuleId;
            targetPath = candidate.targetPath;
        }
    }
    const newEntry = {
        stepId: generateStepId(),
        candidateId: decision.status === "chosen" ? decision.chosenCandidateId : null,
        decisionStatus: decision.status,
        timestampIso: new Date().toISOString(),
        invariantRuleId,
        targetPath,
        expressionBefore,
        errorCode: decision.status === "no-candidates" ? "no-candidates" : undefined,
    };
    return {
        entries: [...history.entries, newEntry],
    };
}
/**
 * Get a snapshot of the history (last step).
 */
export function getSnapshot(history) {
    const lastStep = history.entries.length > 0 ? history.entries[history.entries.length - 1] : null;
    // Return a defensive copy if needed, but StepHistoryEntry is simple data.
    // We treat it as read-only.
    return { lastStep };
}
function generateStepId() {
    return `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
/**
 * Remove the last step from history.
 * Returns a new history object (immutable).
 */
export function removeLastStep(history) {
    if (history.entries.length === 0) {
        return history;
    }
    return {
        entries: history.entries.slice(0, -1)
    };
}
/**
 * Update the last step in history with partial data.
 * Returns a new history object (immutable).
 */
export function updateLastStep(history, updates) {
    if (history.entries.length === 0) {
        return history;
    }
    const lastEntry = history.entries[history.entries.length - 1];
    const updatedEntry = { ...lastEntry, ...updates };
    return {
        entries: [...history.entries.slice(0, -1), updatedEntry]
    };
}
