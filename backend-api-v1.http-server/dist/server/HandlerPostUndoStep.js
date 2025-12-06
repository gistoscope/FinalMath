/**
 * HandlerPostUndoStep — HTTP-agnostic handler for Undo.
 *
 * Responsibilities:
 * - validate the incoming JSON payload as UndoStepRequest;
 * - delegate to Orchestrator.undoLastStep;
 * - return UndoStepResponse.
 */
import { undoLastStep, } from "../orchestrator/index";
function makeError(message) {
    return {
        status: "error",
        expressionLatex: "",
    };
}
/**
 * Validate and normalise the incoming JSON, delegate to the orchestrator.
 */
export async function HandlerPostUndoStep(body, deps) {
    const log = deps.log ?? (() => { });
    try {
        if (body === null || typeof body !== "object") {
            return makeError("Request body must be a JSON object.");
        }
        const obj = body;
        const sessionId = obj["sessionId"];
        if (typeof sessionId !== "string") {
            return makeError("Field 'sessionId' (string) is required.");
        }
        const request = {
            sessionId,
        };
        const ctx = {
            invariantRegistry: deps.invariantRegistry,
            policy: deps.policy,
        };
        const previousExpression = await undoLastStep(ctx, request.sessionId);
        if (previousExpression === null) {
            return {
                status: "no-history",
                expressionLatex: "",
            };
        }
        return {
            status: "undo-complete",
            expressionLatex: previousExpression,
        };
    }
    catch (error) {
        const message = error instanceof Error
            ? error.message
            : "Unknown error in HandlerPostUndoStep.";
        log(`[HandlerPostUndoStep] Error: ${message}`);
        return makeError(message);
    }
}
