import { describe, test, expect } from "vitest";
import { mapMasterGenerate, type MapMasterInput } from "../src/mapmaster/mapmaster.core";
import { InMemoryInvariantRegistry } from "../src/invariants/index";

describe("MapMaster Target-Specific Execution", () => {
    const registry = new InMemoryInvariantRegistry({
        model: {
            primitives: [{
                id: "P.INT_ADD",
                name: "Add Integers",
                description: "Add integers",
                category: "integer",
                tags: [],
                pattern: "a + b", // Use pattern to enable GenericPatternMatcher
                resultPattern: undefined,
            }],
            invariantSets: [{
                id: "test-set",
                name: "Test Set",
                description: "Test Set",
                version: "1.0",
                rules: [
                    {
                        id: "rule-add",
                        title: "Add Integers",
                        shortStudentLabel: "Add",
                        teacherLabel: "Add Integers",
                        description: "Add Integers",
                        level: "basic",
                        tags: [],
                        primitiveIds: ["P.INT_ADD"],
                        scenarioId: "default",
                        teachingTag: "arithmetic",
                    }
                ]
            }]
        }
    });

    test("should only generate candidates for selectionPath and its context", () => {
        const input: MapMasterInput = {
            expressionLatex: "(2+2) + (3+3)",
            selectionPath: "term[1]", // Select right child (3+3)
            invariantSetIds: ["test-set"],
            registry,
        };

        const result = mapMasterGenerate(input);

        // We expect a candidate for 3+3 (term[1])
        const candidateRight = result.candidates.find(c => c.targetPath === "term[1]");
        expect(candidateRight).toBeDefined();
        expect(candidateRight?.invariantRuleId).toBe("rule-add");

        // We expect NO candidate for 2+2 (term[0])
        const candidateLeft = result.candidates.find(c => c.targetPath === "term[0]");
        expect(candidateLeft).toBeUndefined();

        // We expect NO candidate for root (term[0] + term[1]) because it's (expr + expr)
        const candidateRoot = result.candidates.find(c => c.targetPath === "root");
        expect(candidateRoot).toBeUndefined();
    });

    test("should generate candidate for root if selected", () => {
        const input: MapMasterInput = {
            expressionLatex: "2+2",
            selectionPath: "root",
            invariantSetIds: ["test-set"],
            registry,
        };

        const result = mapMasterGenerate(input);
        expect(result.candidates.length).toBeGreaterThan(0);
        expect(result.candidates[0].targetPath).toBe("root");
    });
});
