/**
 * HandlerPostEntryStep — HTTP-agnostic handler for Backend API v1.
 *
 * Responsibilities:
 * - validate the incoming JSON payload as EntryStepRequest;
 * - delegate the actual computation to Step Orchestrator;
 * - normalise unexpected errors into a structured EngineStepResponse.
 */
import { runOrchestratorStep, } from "../orchestrator/index";
import { createTeacherDebugPolicy } from "../stepmaster/index";
import { authService } from "../auth/auth.service";
function makeError(status, message, expressionLatex) {
    return {
        status,
        expressionLatex: expressionLatex ?? "",
    };
}
/**
 * Validate and normalise the incoming JSON, delegate to the orchestrator.
 */
export async function HandlerPostEntryStep(body, deps) {
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
        const request = {
            sessionId: typeof rawSessionId === "string" ? rawSessionId : "default-session",
            courseId: typeof rawCourseId === "string" ? rawCourseId : "default",
            expressionLatex: rawLatex,
            selectionPath: typeof rawSelection === "string" ? rawSelection : null,
            operatorIndex: typeof obj["operatorIndex"] === "number" ? obj["operatorIndex"] : undefined,
            policyId: typeof obj["policyId"] === "string" ? obj["policyId"] : undefined,
            token: typeof obj["token"] === "string" ? obj["token"] : undefined,
        };
        // Auth & Role Extraction
        let userRole = "student";
        let userId = undefined;
        if (request.token) {
            const token = authService.validateToken(request.token);
            if (token) {
                userRole = token.role;
                userId = token.userId;
            }
        }
        let policy = deps.policy;
        if (request.policyId === "teacher.debug") {
            policy = createTeacherDebugPolicy();
        }
        const ctx = {
            invariantRegistry: deps.invariantRegistry,
            policy: policy,
        };
        const orchestratorReq = {
            sessionId: request.sessionId,
            courseId: request.courseId || "default",
            expressionLatex: request.expressionLatex,
            selectionPath: request.selectionPath,
            operatorIndex: request.operatorIndex,
            userRole: userRole,
            userId: userId,
        };
        if (deps.performStep) {
            return await deps.performStep(request);
        }
        const result = await runOrchestratorStep(ctx, orchestratorReq);
        // Map result to response
        let responseLatex = request.expressionLatex;
        if (result.status === "step-applied" && result.engineResult?.newExpressionLatex) {
            responseLatex = result.engineResult.newExpressionLatex;
        }
        return {
            status: result.status,
            expressionLatex: responseLatex,
            debugInfo: result.debugInfo,
        };
    }
    catch (error) {
        const message = error instanceof Error
            ? error.message
            : "Unknown error in HandlerPostEntryStep.";
        if (deps.logger) {
            deps.logger.error({ err: error }, `[HandlerPostEntryStep] Error: ${message}`);
        }
        else {
            log(`[HandlerPostEntryStep] Error: ${message}`);
        }
        return makeError("engine-error", message);
    }
}
