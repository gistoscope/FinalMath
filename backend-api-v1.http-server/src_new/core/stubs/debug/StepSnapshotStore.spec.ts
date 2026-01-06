import { beforeEach, describe, expect, it } from "vitest";
import { StepSnapshotStore, type StepSnapshot } from "./StepSnapshotStore";

describe("StepSnapshotStore", () => {
  const mockSnapshot: StepSnapshot = {
    id: "step-1",
    timestamp: "2024-01-01T00:00:00Z",
    inputLatex: "1+1",
    engineResponseStatus: "ok",
  };

  beforeEach(() => {
    StepSnapshotStore.resetSession();
  });

  it("should set and get latest snapshot", () => {
    StepSnapshotStore.setLatest(mockSnapshot);
    expect(StepSnapshotStore.getLatest()).toEqual(mockSnapshot);
  });

  it("should append snapshots to session and assign stepIndex", () => {
    const s1 = StepSnapshotStore.appendSnapshot({ ...mockSnapshot, id: "s1" });
    const s2 = StepSnapshotStore.appendSnapshot({ ...mockSnapshot, id: "s2" });

    expect(s1.stepIndex).toBe(0);
    expect(s2.stepIndex).toBe(1);
    expect(s1.id).toBe("s1");
    expect(s2.id).toBe("s2");

    const session = StepSnapshotStore.getSessionSnapshots();
    expect(session).toHaveLength(2);
    expect(session[0]).toEqual(s1);
    expect(session[1]).toEqual(s2);
  });

  it("should reset session", () => {
    StepSnapshotStore.appendSnapshot(mockSnapshot);
    expect(StepSnapshotStore.getSessionSnapshots()).toHaveLength(1);

    StepSnapshotStore.resetSession();
    expect(StepSnapshotStore.getSessionSnapshots()).toHaveLength(0);

    // Verify index resets
    const s = StepSnapshotStore.appendSnapshot(mockSnapshot);
    expect(s.stepIndex).toBe(0);
  });
});
