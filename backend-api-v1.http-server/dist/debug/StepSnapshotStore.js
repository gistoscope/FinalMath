/**
 * StepSnapshotStore.ts
 *
 * In-memory store for the latest step snapshot.
 * Used for debugging to inspect the details of the last executed step.
 */
let latestSnapshot = null;
let sessionSnapshots = [];
let currentStepIndex = 0;
export const StepSnapshotStore = {
    setLatest(snapshot) {
        latestSnapshot = snapshot;
        console.log(`[STEP SNAPSHOT] id=${snapshot.id} status=${snapshot.engineResponseStatus}`);
    },
    getLatest() {
        return latestSnapshot;
    },
    appendSnapshot(snapshot) {
        const sessionSnapshot = {
            ...snapshot,
            stepIndex: currentStepIndex++
        };
        sessionSnapshots.push(sessionSnapshot);
        return sessionSnapshot;
    },
    getSessionSnapshots() {
        return [...sessionSnapshots];
    },
    resetSession() {
        sessionSnapshots = [];
        currentStepIndex = 0;
        console.log("[STEP SNAPSHOT] Session reset");
    }
};
