import { parseExpression } from "../mapmaster/ast";
export async function handlePostAstDebug(req, res, body) {
    const request = body;
    if (!request || typeof request.latex !== "string") {
        sendJson(res, 400, {
            type: "error",
            message: "Invalid request: 'latex' string is required."
        });
        return;
    }
    try {
        const ast = parseExpression(request.latex);
        if (ast) {
            sendJson(res, 200, {
                type: "ok",
                ast: ast,
                message: "Parsed successfully"
            });
        }
        else {
            sendJson(res, 200, {
                type: "error",
                message: "Parser returned null (parsing failed)"
            });
        }
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        sendJson(res, 500, {
            type: "error",
            message: `Internal parser error: ${msg}`
        });
    }
}
function sendJson(res, statusCode, payload) {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
}
