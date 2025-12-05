import { describe, it, test, expect, beforeAll } from "vitest";
import { loadInvariantRegistryFromFile } from "../../src/invariants/index";
import { createDefaultStudentPolicy } from "../../src/stepmaster/index";
import { runOrchestratorStep, type OrchestratorContext } from "../../src/orchestrator/index";
import { createEmptyHistory } from "../../src/stepmaster/stepmaster.history-service";
import { SessionService } from "../../src/session/session.service";

describe("Stage-1 Atomic Behavior", () => {
    let ctx: OrchestratorContext;

    beforeAll(() => {
        const registry = loadInvariantRegistryFromFile({
            path: "config/courses/default.course.invariants.json",
        });
        ctx = {
            invariantRegistry: registry,
            policy: createDefaultStudentPolicy(),
        };
    });

    it("FRAC_ADD_SAME: 1/7 + 3/7 -> 4/7", async () => {
        const res = await runOrchestratorStep(ctx, {
            sessionId: "test-session-1",
            courseId: "default",
            expressionLatex: "\\frac{1}{7} + \\frac{3}{7}",
            selectionPath: "root", // Click on '+' (root)
            userRole: "student",
        });

        expect(res.status).toBe("step-applied");
        // Expect exact fraction, no decimals
        expect(res.engineResult?.newExpressionLatex).toBe("\\frac{4}{7}");
    });

    it("FRAC_ADD_SAME: 5/7 + 2/7 -> 7/7", async () => {
        const res = await runOrchestratorStep(ctx, {
            sessionId: "test-session-2",
            courseId: "default",
            expressionLatex: "\\frac{5}{7} + \\frac{2}{7}",
            selectionPath: "root",
            userRole: "student",
        });

        expect(res.status).toBe("step-applied");
        expect(res.engineResult?.newExpressionLatex).toBe("\\frac{7}{7}");
    });

    it("INT_PLUS_FRAC: 3 + 5/7 -> no-candidates (Stage-1 Strict)", async () => {
        const res = await runOrchestratorStep(ctx, {
            sessionId: "test-session-3",
            courseId: "default",
            expressionLatex: "3 + \\frac{5}{7}",
            selectionPath: "root",
            userRole: "student",
        });

        // Stage-1 Strict Mode disables INT_PLUS_FRAC
        expect(res.status).toBe("no-candidates");
    });

    it("INT_PLUS_FRAC: 5/7 + 3 -> no-candidates (Stage-1 Strict)", async () => {
        const res = await runOrchestratorStep(ctx, {
            sessionId: "test-session-4",
            courseId: "default",
            expressionLatex: "\\frac{5}{7} + 3",
            selectionPath: "root",
            userRole: "student",
        });

        expect(res.status).toBe("no-candidates");
    });

    it("INT_DIV_EXACT: Should NOT be chosen on '+' click in (6/2 + 12/2)", async () => {
        // 6/2 + 12/2
        // Click on '+' (root)
        // Should NOT apply INT_DIV_EXACT to 6/2 or 12/2
        // Should apply FRAC_ADD_SAME if applicable.

        const res = await runOrchestratorStep(ctx, {
            sessionId: "test-session-5",
            courseId: "default",
            expressionLatex: "\\frac{6}{2} + \\frac{12}{2}",
            selectionPath: "root",
            userRole: "student",
        });

        // If FRAC_ADD_SAME is chosen:
        if (res.status === "step-applied") {
            expect(res.engineResult?.newExpressionLatex).toBe("\\frac{18}{2}");
        } else {
            // If FRAC_ADD_SAME is NOT chosen (e.g. maybe 6/2 is treated as int?), 
            // at least ensure it's NOT INT_DIV_EXACT (which would change one fraction).
            // But we really want FRAC_ADD_SAME.
            // If it returns no-candidates, that's also "safe" regarding INT_DIV_EXACT, 
            // but suboptimal.
            // Let's assert step-applied for now.
            expect(res.status).toBe("step-applied");
        }
    });

    test("Regression: 2 + 3 - 1 flow (INT_ADD then INT_SUB)", async () => {
        let history = createEmptyHistory();
        const sessionId = `test-session-${Date.now()}-reg1`;
        await SessionService.createSession(sessionId, "user1", "course1");

        // Step 1: Click "+"
        let res = await runOrchestratorStep(ctx, {
            sessionId,
            courseId: "default",
            expressionLatex: "2 + 3 - 1",
            selectionPath: "term[0]", // The plus node
            userRole: "student"
        });

        expect(res.status).toBe("step-applied");
        expect(res.engineResult?.newExpressionLatex).toBe("5 - 1");

        // Step 2: Click "-"
        // Now expression is "5 - 1". Root is "-".
        res = await runOrchestratorStep(ctx, {
            sessionId,
            courseId: "default",
            expressionLatex: "5 - 1",
            selectionPath: "root", // The minus node
            userRole: "student"
        });

        expect(res.status).toBe("step-applied");
        expect(res.engineResult?.newExpressionLatex).toBe("4");
    });

    test("Regression: 1/7 + 3/7 anchoring (FRAC_ADD_SAME vs INT_DIV_EXACT)", async () => {
        const sessionId = `test-session-${Date.now()}-reg2`;
        await SessionService.createSession(sessionId, "user1", "course1");

        const res = await runOrchestratorStep(ctx, {
            sessionId,
            courseId: "default",
            expressionLatex: "\\frac{1}{7} + \\frac{3}{7}",
            selectionPath: "root",
            userRole: "student"
        });

        expect(res.status).toBe("step-applied");
        expect(res.engineResult?.newExpressionLatex).toBe("\\frac{4}{7}");
    });

    test("Regression: 3 + 6 - (5/7 + 2/7) anchoring", async () => {
        const sessionId = `test-session-${Date.now()}-reg3`;
        await SessionService.createSession(sessionId, "user1", "course1");

        const res = await runOrchestratorStep(ctx, {
            sessionId,
            courseId: "default",
            expressionLatex: "3 + 6 - (\\frac{5}{7} + \\frac{2}{7})",
            selectionPath: "term[0]",
            userRole: "student"
        });

        expect(res.status).toBe("step-applied");
        // 9 - (5/7 + 2/7)
        // Printer adds spaces around binary ops
        expect(res.engineResult?.newExpressionLatex).toBe("9 - (\\frac{5}{7} + \\frac{2}{7})");
    });
});
