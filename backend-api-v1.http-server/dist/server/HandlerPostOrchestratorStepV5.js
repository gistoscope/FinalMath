import { runOrchestratorStep } from "../orchestrator/index";
import { createTeacherDebugPolicy } from "../stepmaster/index";
import { authService } from "../auth/auth.service";
function makeError(status, message, expressionLatex) {
    // Return a shape compatible with OrchestratorStepResult but indicating error
    return {
        status: status,
        engineResult: { ok: false, errorCode: message },
        history: { entries: [] }, // Empty history for fatal request errors
        debugInfo: { error: message }
    };
}
export async function handlePostOrchestratorStepV5(body, deps) {
    const log = deps.log ?? (() => { });
    try {
        if (body === null || typeof body !== "object") {
            return makeError("engine-error", "Request body must be a JSON object.");
        }
        const obj = body;
        const rawLatex = obj["expressionLatex"];
        const rawSelection = obj["selectionPath"];
        const rawSessionId = obj["sessionId"];
        const rawCourseId = obj["courseId"];
        if (typeof rawLatex !== "string") {
            return makeError("engine-error", "Field 'expressionLatex' (string) is required.");
        }
        if (typeof rawSessionId !== "string") {
            return makeError("engine-error", "Field 'sessionId' (string) is required.");
        }
        // Construct Orchestrator Request
        const request = {
            sessionId: rawSessionId,
            courseId: typeof rawCourseId === "string" ? rawCourseId : "default",
            expressionLatex: rawLatex,
            selectionPath: typeof rawSelection === "string" ? rawSelection : null,
            operatorIndex: typeof obj["operatorIndex"] === "number" ? obj["operatorIndex"] : undefined,
            userRole: "student",
            userId: undefined
        };
        // Auth & Role Extraction (Optional but good to have)
        if (typeof obj["token"] === "string") {
            const token = authService.validateToken(obj["token"]);
            if (token) {
                request.userRole = token.role;
                request.userId = token.userId;
            }
        }
        // Policy setup
        let policy = deps.policy;
        const policyId = obj["policyId"];
        if (policyId === "teacher.debug") {
            policy = createTeacherDebugPolicy();
        }
        const ctx = {
            invariantRegistry: deps.invariantRegistry,
            policy: policy,
            primitiveMaster: deps.primitiveMaster,
        };
        // Execute via Orchestrator V5
        const result = await runOrchestratorStep(ctx, request);
        return result;
    }
    catch (error) {
        const message = error instanceof Error
            ? error.message
            : "Unknown error in HandlerPostOrchestratorStepV5.";
        if (deps.logger) {
            deps.logger.error({ err: error }, `[HandlerPostOrchestratorStepV5] Error: ${message}`);
        }
        else {
            log(`[HandlerPostOrchestratorStepV5] Error: ${message}`);
        }
        return makeError("engine-error", message);
    }
}
