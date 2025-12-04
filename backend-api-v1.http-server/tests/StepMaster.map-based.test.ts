import { describe, test, expect } from "vitest";
import { stepMasterDecideFromMap, StepMasterMapInput } from "../src/stepmaster/stepmaster.core";
import { MapBuilder } from "../src/mapmaster/map-builder";
import { parseExpression } from "../src/mapmaster/ast";
import { MapMasterCandidate } from "../src/mapmaster/mapmaster.core";
import { createEmptyHistory, getSnapshot } from "../src/stepmaster/stepmaster.history-service";
import { createDefaultStudentPolicy } from "../src/stepmaster/stepmaster.policy";

describe("StepMaster Map-Based Decision", () => {
    test("should select action on specific node", () => {
        const latex = "3 + 5";
        const ast = parseExpression(latex);
        if (!ast) throw new Error("Parse failed");

        const candidates: MapMasterCandidate[] = [
            {
                id: "cand-1" as any,
                invariantRuleId: "rule-add",
                primitiveIds: ["P.INT_ADD"],
                targetPath: "root", // Root is the binaryOp (+)
                description: "Add integers",
                resultPattern: "8"
            }
        ];

        const map = MapBuilder.build(latex, ast, candidates);

        // Input: Select the root node (the + operator)
        const input: StepMasterMapInput = {
            candidates,
            history: getSnapshot(createEmptyHistory()),
            policy: createDefaultStudentPolicy(),
            map,
            selectionPath: "root"
        };

        const result = stepMasterDecideFromMap(input);

        expect(result.decision.status).toBe("chosen");
        expect(result.decision.chosenCandidateId).toBe("cand-1");
    });

    test("should NOT select action if unrelated node is selected", () => {
        const latex = "3 + 5";
        const ast = parseExpression(latex);
        if (!ast) throw new Error("Parse failed");

        const candidates: MapMasterCandidate[] = [
            {
                id: "cand-1" as any,
                invariantRuleId: "rule-add",
                primitiveIds: ["P.INT_ADD"],
                targetPath: "root",
                description: "Add integers",
                resultPattern: "8"
            }
        ];

        const map = MapBuilder.build(latex, ast, candidates);

        // Input: Select "3" (term[0]). 
        // Note: "3" is a child of "root".
        // Does selecting "3" allow "root" action?
        // In "Broken Locality" fix, we said: "Keep if selection is a parent of candidate".
        // Wait, if I select "3" (child), do I want to trigger "3+5" (parent)?
        // The adapter logic says: "Traverse up".
        // So yes, it should work.

        const input: StepMasterMapInput = {
            candidates,
            history: getSnapshot(createEmptyHistory()),
            policy: createDefaultStudentPolicy(),
            map,
            selectionPath: "term[0]"
        };

        const result = stepMasterDecideFromMap(input);

        // It SHOULD be chosen because of bubbling
        expect(result.decision.status).toBe("chosen");
        expect(result.decision.chosenCandidateId).toBe("cand-1");
    });

    test("should NOT select action if completely unrelated node is selected (hypothetical)", () => {
        // Hard to test with simple AST, but let's try (3+5) + 2
        const latex = "(3+5)+2";
        const ast = parseExpression(latex);
        if (!ast) throw new Error("Parse failed");

        // Candidate for 3+5 (term[0].content)
        const candidates: MapMasterCandidate[] = [
            {
                id: "cand-inner" as any,
                invariantRuleId: "rule-add",
                primitiveIds: ["P.INT_ADD"],
                targetPath: "term[0].content",
                description: "Add 3+5",
                resultPattern: "8"
            }
        ];

        const map = MapBuilder.build(latex, ast, candidates);

        // Select "2" (term[1])
        const input: StepMasterMapInput = {
            candidates,
            history: getSnapshot(createEmptyHistory()),
            policy: createDefaultStudentPolicy(),
            map,
            selectionPath: "term[1]"
        };

        const result = stepMasterDecideFromMap(input);

        expect(result.decision.status).toBe("no-candidates");
    });
});
