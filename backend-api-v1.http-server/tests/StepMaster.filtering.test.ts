import { describe, test, expect } from "vitest";
import { stepMasterDecide, type StepMasterInput, type StepMasterResult } from "../src/stepmaster/stepmaster.core";
import type { MapMasterCandidate, MapMasterCandidateId } from "../src/mapmaster/index";
import { createEmptyHistory, getSnapshot } from "../src/stepmaster/stepmaster.history-service";
import { createDefaultStudentPolicy } from "../src/stepmaster/stepmaster.policy";

describe("StepMaster Selection Filtering", () => {
    const policy = createDefaultStudentPolicy();
    const history = getSnapshot(createEmptyHistory());

    const candidateRoot: MapMasterCandidate = {
        id: "c-root" as MapMasterCandidateId,
        invariantRuleId: "rule-root",
        primitiveIds: [],
        targetPath: "root",
        description: "Root Rule",
    };

    const candidateLeft: MapMasterCandidate = {
        id: "c-left" as MapMasterCandidateId,
        invariantRuleId: "rule-left",
        primitiveIds: [],
        targetPath: "term[0]",
        description: "Left Child Rule",
    };

    const candidateRight: MapMasterCandidate = {
        id: "c-right" as MapMasterCandidateId,
        invariantRuleId: "rule-right",
        primitiveIds: [],
        targetPath: "term[1]",
        description: "Right Child Rule",
    };

    const candidates = [candidateRoot, candidateLeft, candidateRight];

    test("should keep candidate if selectionPath matches exactly", () => {
        const input: StepMasterInput = {
            candidates,
            history,
            policy,
            selectionPath: "term[0]",
        };

        const result = stepMasterDecide(input);

        // Should pick c-left because it matches exactly. 
        // c-root is also valid (bubbling), but c-left is usually preferred or at least valid.
        // Logic:
        // - c-root: KEEP (targetPath="root")
        // - c-left: KEEP (exact match)
        // - c-right: DISCARD (no relation)

        expect(result.decision.status).toBe("chosen");
        expect(result.decision.chosenCandidateId).not.toBe("c-right");
        // We expect c-root or c-left. Since c-root is first in list, it might be picked.
        // This test mainly verifies c-right is excluded.
        expect(["c-root", "c-left"]).toContain(result.decision.chosenCandidateId);
    });

    test("should discard unrelated candidates", () => {
        const input: StepMasterInput = {
            candidates: [candidateRight], // Only right candidate available
            history,
            policy,
            selectionPath: "term[0]", // User clicked left
        };

        const result = stepMasterDecide(input);

        // Should be no-candidates because c-right is unrelated to term[0]
        expect(result.decision.status).toBe("no-candidates");
    });

    test("should allow bubbling up to root", () => {
        const input: StepMasterInput = {
            candidates: [candidateRoot],
            history,
            policy,
            selectionPath: "term[0]", // User clicked left
        };

        const result = stepMasterDecide(input);

        // c-root should be kept because targetPath="root" is always allowed (global rule)
        expect(result.decision.status).toBe("chosen");
        expect(result.decision.chosenCandidateId).toBe("c-root");
    });

    test("should allow selection of parent to affect child (bubbling down/context)", () => {
        // Scenario: User clicks "+" (root), and we have a rule for "6/2" (term[0])
        const input: StepMasterInput = {
            candidates: [candidateLeft],
            history,
            policy,
            selectionPath: "root", // User clicked root
        };

        const result = stepMasterDecide(input);

        // Logic: selectionPath="root" -> ALLOW ALL
        expect(result.decision.status).toBe("chosen");
        expect(result.decision.chosenCandidateId).toBe("c-left");
    });
});
