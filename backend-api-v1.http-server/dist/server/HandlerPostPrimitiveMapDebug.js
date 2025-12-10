/**
 * Handler for Primitive Map Debug endpoint.
 */
import { parseExpression } from "../mapmaster/ast";
import { buildPrimitiveMap } from "../engine/primitives/PrimitiveMapBuilder";
export async function handlePostPrimitiveMapDebug(req, res, body) {
    try {
        const request = body;
        const expressionLatex = request.expressionLatex;
        const stage = request.stage ?? 1;
        if (!expressionLatex || typeof expressionLatex !== "string") {
            sendJson(res, 400, {
                status: "error",
                errorMessage: "expressionLatex is required",
            });
            return;
        }
        // Reuse existing parsing pipeline:
        const ast = parseExpression(expressionLatex);
        if (!ast) {
            sendJson(res, 400, {
                status: "error",
                errorMessage: "Failed to parse expression",
            });
            return;
        }
        const primitiveMap = buildPrimitiveMap(ast, stage, expressionLatex);
        sendJson(res, 200, {
            status: "ok",
            map: primitiveMap,
        });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        sendJson(res, 500, {
            status: "error",
            errorMessage: `Failed to build primitive map: ${msg}`,
        });
    }
}
function sendJson(res, statusCode, payload) {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
}
