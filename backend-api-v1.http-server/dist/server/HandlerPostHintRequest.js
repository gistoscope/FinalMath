import { generateHint, } from "../orchestrator/index";
export async function handlePostHintRequest(body, deps) {
    const obj = body;
    // Basic Validation
    const rawSessionId = obj["sessionId"];
    const rawCourseId = obj["courseId"];
    const rawLatex = obj["expressionLatex"];
    const rawSelection = obj["selectionPath"];
    if (typeof rawLatex !== "string") {
        return {
            status: "error",
            error: "Missing or invalid 'expressionLatex'",
        };
    }
    const request = {
        sessionId: typeof rawSessionId === "string" ? rawSessionId : "default-session",
        courseId: typeof rawCourseId === "string" ? rawCourseId : "default",
        expressionLatex: rawLatex,
        selectionPath: typeof rawSelection === "string" ? rawSelection : null,
    };
    const ctx = {
        invariantRegistry: deps.invariantRegistry,
        policy: deps.policy,
    };
    try {
        const result = await generateHint(ctx, request);
        return result;
    }
    catch (e) {
        return {
            status: "error",
            error: e instanceof Error ? e.message : String(e),
        };
    }
}
