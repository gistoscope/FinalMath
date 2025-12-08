import { describe, it, expect } from "vitest";
import { runOrchestratorStep, OrchestratorContext, OrchestratorStepRequest } from "../src/orchestrator/step.orchestrator";
import { createInMemoryInvariantRegistry } from "../src/invariants/index";
import { createDefaultStudentPolicy } from "../src/stepmaster/index";

describe("Entry Step Stage 1 Smoke Test", () => {
    const registry = createInMemoryInvariantRegistry();
    const policy = createDefaultStudentPolicy();
    const ctx: OrchestratorContext = {
        invariantRegistry: registry,
        policy: policy
    };

    it("performs integer addition 2 + 3 -> 5", async () => {
        const req: OrchestratorStepRequest = {
            sessionId: "test-session",
            courseId: "default", // Assuming default course has integer arithmetic
            expressionLatex: "2 + 3",
            selectionPath: "term[0].op", // Assuming click on operator
            operatorIndex: 0,
            userRole: "student"
        };

        const result = await runOrchestratorStep(ctx, req);

        expect(result.status).toBe("step-applied");
        expect(result.engineResult?.newExpressionLatex).toBe("5");
        expect(result.primitiveDebug?.primitiveId).toBe("INT_ADD_STAGE1");
    });

    it("performs fraction addition 4/7 + 5/7 -> 9/7", async () => {
        const req: OrchestratorStepRequest = {
            sessionId: "test-session",
            courseId: "fractions-basic-v1", // Assuming this course has fraction arithmetic
            expressionLatex: "\\frac{4}{7} + \\frac{5}{7}",
            selectionPath: "term[0].op",
            operatorIndex: 0,
            userRole: "student"
        };

        const result = await runOrchestratorStep(ctx, req);

        expect(result.status).toBe("step-applied");
        expect(result.engineResult?.newExpressionLatex).toBe("\\frac{9}{7}");
        expect(result.primitiveDebug?.primitiveId).toBe("FRAC_ADD_SAME_DEN_STAGE1");
    });
});
