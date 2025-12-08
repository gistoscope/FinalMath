import { describe, it, expect } from "vitest";
import { runOrchestratorStep, type OrchestratorContext, type OrchestratorStepRequest } from "../src/orchestrator/index";
import { loadAllCoursesFromDir } from "../src/invariants/index";
import { createDefaultStudentPolicy } from "../src/stepmaster/index";
import { getStage1RegistryModel } from "../src/mapmaster/stage1-converter";
import { InMemoryInvariantRegistry } from "../src/invariants/invariants.registry";

describe("Orchestrator V5 Flow", () => {
    // Setup dependencies similarly to cliEngineHttpServer to include Stage 1 rules
    const fileRegistry = loadAllCoursesFromDir({ path: "config/courses" });
    const stage1Model = getStage1RegistryModel();

    const fileModel = {
        primitives: fileRegistry.getAllPrimitives(),
        invariantSets: fileRegistry.getAllInvariantSets()
    };
    const mergedPrimitives = [...fileModel.primitives];
    const seenPrimIds = new Set(fileModel.primitives.map(p => p.id));
    for (const prim of stage1Model.primitives) {
        if (!seenPrimIds.has(prim.id)) {
            mergedPrimitives.push(prim);
            seenPrimIds.add(prim.id);
        }
    }
    const mergedSets = [...fileModel.invariantSets];
    const defaultSetIndex = mergedSets.findIndex(s => s.id === "default");
    if (defaultSetIndex >= 0) {
        const defaultSet = mergedSets[defaultSetIndex];
        const allStage1Rules = stage1Model.invariantSets.flatMap(s => s.rules);
        const seenRuleIds = new Set(defaultSet.rules.map(r => r.id));
        for (const rule of allStage1Rules) {
            if (!seenRuleIds.has(rule.id)) {
                defaultSet.rules.push(rule);
                seenRuleIds.add(rule.id);
            }
        }
    }

    const registry = new InMemoryInvariantRegistry({
        model: { primitives: mergedPrimitives, invariantSets: mergedSets }
    });

    const ctx: OrchestratorContext = {
        invariantRegistry: registry,
        policy: createDefaultStudentPolicy(),
    };

    it("should execute P.INT_ADD for '1 + 2' when anchored to operator", async () => {
        const req: OrchestratorStepRequest = {
            sessionId: "v5-test-session",
            courseId: "default",
            expressionLatex: "1 + 2",
            selectionPath: "root",
            userRole: "student",
        };

        const result = await runOrchestratorStep(ctx, req);

        expect(result.status).toBe("step-applied");
        expect(result.engineResult?.newExpressionLatex).toBe("3");
        // Verify we kept history
        expect(result.history.entries.length).toBeGreaterThan(0);
        expect(result.history.entries[result.history.entries.length - 1].expressionAfter).toBe("3");
    });

    it("should execute P.INT_DIV_TO_INT for '4 : 2' (exact division)", async () => {
        const req: OrchestratorStepRequest = {
            sessionId: "v5-test-session",
            courseId: "default",
            expressionLatex: "4 : 2",
            selectionPath: "root",
            userRole: "student",
        };

        const result = await runOrchestratorStep(ctx, req);

        expect(result.status).toBe("step-applied");
        expect(result.engineResult?.newExpressionLatex).toBe("2");
    });

    it("should fail gracefully for invalid primitive execution (e.g. 5 : 0)", async () => {
        const req: OrchestratorStepRequest = {
            sessionId: "v5-test-session",
            courseId: "default",
            expressionLatex: "5 : 0",
            selectionPath: "root",
            userRole: "student",
        };

        const result = await runOrchestratorStep(ctx, req);

        if (result.status === "no-candidates") {
            expect(result.status).toBe("no-candidates");
        } else {
            expect(result.status).toBe("engine-error");
            expect(result.engineResult?.errorCode).toContain("division-by-zero");
        }
    });

    it("should execute P.FRAC_ADD_SAME_DEN for '1/7 + 3/7' when anchored to operator", async () => {
        const uniqueId = "v5-test-session-frac-" + Math.random().toString(36).substring(7);
        const req: OrchestratorStepRequest = {
            sessionId: uniqueId,
            courseId: "default",
            expressionLatex: "1/7 + 3/7",
            selectionPath: "root",
            userRole: "student",
        };

        const result = await runOrchestratorStep(ctx, req);

        expect(result.status).toBe("step-applied");
        expect(result.engineResult?.newExpressionLatex).toBe("\\frac{4}{7}");
    });
});
