/**
 * engineHttpServer.ts
 *
 * Thin HTTP wrapper around HandlerPostEntryStep for Backend API v1.
 */
import http from "node:http";
import { HandlerPostEntryStep, } from "./HandlerPostEntryStep.js";
import { HandlerPostUndoStep, } from "./HandlerPostUndoStep.js";
import { handlePostHintRequest, } from "./HandlerPostHintRequest.js";
import { handleGetStudentProgress } from "./HandlerReporting.js";
import { StepSnapshotStore } from "../debug/StepSnapshotStore.js";
export function createEngineHttpServer(options) {
    const { port, handlerDeps, logger } = options;
    // Fallback if no logger provided (though we expect one)
    const logInfo = (msg) => logger ? logger.info(msg) : console.log(msg);
    const logError = (obj, msg) => logger ? logger.error(obj, msg) : console.error(msg, obj);
    const server = http.createServer(async (req, res) => {
        // Enable CORS
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
        }
        const rawUrl = req.url ?? "/";
        const [urlPath] = rawUrl.split("?", 2);
        const url = urlPath || "/";
        // POST /api/entry-step (TzV1.1)
        // We also support /engine/step for backward compatibility if needed, 
        // but TZ specifies /api/entry-step.
        // STUDENT-FACING ENGINE ENDPOINT:
        // This endpoint is called by the main Viewer/Adapter in the learning flow.
        // It MUST NOT depend on any debug-only endpoints.
        if (req.method === "POST" && (url === "/api/entry-step" ||
            url === "/engine/step" ||
            url === "/api/undo-step" ||
            url === "/api/hint-request" ||
            url === "/api/register" ||
            url === "/api/login" ||
            url === "/api/ast-debug" ||
            url === "/api/mapmaster-debug" ||
            url === "/api/mapmaster-global-map" ||
            url === "/api/step-debug" ||
            url === "/api/step-debug" ||
            url === "/api/primitive-map-debug" ||
            url === "/api/orchestrator/v5/step")) {
            let body = "";
            req.on("data", (chunk) => {
                body += chunk.toString();
            });
            req.on("end", async () => {
                let parsedBody;
                try {
                    parsedBody = body.length > 0 ? JSON.parse(body) : null;
                }
                catch (error) {
                    const message = error instanceof Error
                        ? error.message
                        : "Invalid JSON in request body.";
                    logError({ err: error }, `[EngineHttpServer] JSON parse error: ${message}`);
                    const errorResponse = {
                        status: "engine-error",
                        expressionLatex: "", // Cannot echo back if JSON is invalid
                    };
                    sendJson(res, 400, errorResponse);
                    return;
                }
                try {
                    let response;
                    // POST /api/entry-step (TzV1.1)
                    // We also support /engine/step for backward compatibility if needed,
                    // but TZ specifies /api/entry-step.
                    if (url === "/api/entry-step" || url === "/engine/step") {
                        response = await HandlerPostEntryStep(parsedBody, handlerDeps);
                    }
                    else if (url === "/api/undo-step") {
                        response = await HandlerPostUndoStep(parsedBody, handlerDeps);
                    }
                    else if (url === "/api/hint-request") {
                        response = await handlePostHintRequest(parsedBody, handlerDeps);
                    }
                    else if (url === "/api/ast-debug") {
                        // DEBUG/TOOLS ONLY:
                        // This endpoint is used exclusively by viewer/debug-tool.html (Dev Tool).
                        // It MUST NOT be called from the student-facing Viewer/Adapter or main UI.
                        const { handlePostAstDebug } = await import("./HandlerPostAstDebug.js");
                        await handlePostAstDebug(req, res, parsedBody);
                        return; // Handler sends response
                    }
                    else if (url === "/api/mapmaster-debug") {
                        // DEBUG/TOOLS ONLY:
                        // This endpoint is used exclusively by viewer/debug-tool.html (Dev Tool).
                        // It MUST NOT be called from the student-facing Viewer/Adapter or main UI.
                        const { handlePostMapMasterDebug } = await import("./HandlerPostMapMasterDebug.js");
                        await handlePostMapMasterDebug(req, res, parsedBody);
                        return; // Handler sends response
                    }
                    else if (url === "/api/mapmaster-global-map") {
                        // DEBUG/TOOLS ONLY:
                        // This endpoint is used exclusively by viewer/debug-tool.html (Dev Tool).
                        // It MUST NOT be called from the student-facing Viewer/Adapter or main UI.
                        const { handlePostMapMasterGlobalMap } = await import("./HandlerPostMapMasterGlobalMap.js");
                        await handlePostMapMasterGlobalMap(req, res, parsedBody);
                        return; // Handler sends response
                    }
                    else if (url === "/api/step-debug") {
                        // DEBUG/TOOLS ONLY:
                        // This endpoint is used exclusively by viewer/debug-tool.html (Dev Tool).
                        // It MUST NOT be called from the student-facing Viewer/Adapter or main UI.
                        const { handlePostStepDebug } = await import("./HandlerPostStepDebug.js");
                        await handlePostStepDebug(req, res, parsedBody);
                        return; // Handler sends response
                    }
                    else if (url === "/api/primitive-map-debug") {
                        // DEBUG/TOOLS ONLY:
                        // This endpoint is used exclusively by viewer/debug-tool.html (Dev Tool).
                        // It MUST NOT be called from the student-facing Viewer/Adapter or main UI.
                        const { handlePostPrimitiveMapDebug } = await import("./HandlerPostPrimitiveMapDebug.js");
                        await handlePostPrimitiveMapDebug(req, res, parsedBody);
                        return; // Handler sends response
                    }
                    else if (url === "/api/orchestrator/v5/step") {
                        // NEW V5 ENDPOINT
                        const { handlePostOrchestratorStepV5 } = await import("./HandlerPostOrchestratorStepV5.js");
                        const result = await handlePostOrchestratorStepV5(parsedBody, handlerDeps);
                        response = result;
                    }
                    // POST /api/register
                    // else if (url === "/api/register") {
                    //   response = await handlePostRegister(parsedBody, handlerDeps);
                    // }
                    // POST /api/login
                    // else if (url === "/api/login") {
                    //   response = await handlePostLogin(parsedBody, handlerDeps);
                    // }
                    else {
                        // If it's a POST request but not a recognized path
                        sendJson(res, 404, {
                            status: "engine-error",
                            message: "POST route not found.",
                        });
                        return;
                    }
                    sendJson(res, 200, response);
                }
                catch (error) {
                    const message = error instanceof Error
                        ? error.message
                        : "Unexpected error in HTTP server.";
                    logError({ err: error }, `[EngineHttpServer] Unhandled error: ${message}`);
                    const errorResponse = {
                        status: "engine-error",
                        expressionLatex: "",
                    };
                    sendJson(res, 500, errorResponse);
                }
            });
            return;
        }
        if (req.method === "GET" && url === "/health") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end("ok");
            return;
        }
        if (req.method === "GET" && url === "/api/teacher/student-progress") {
            await handleGetStudentProgress(req, res);
            return;
        }
        if (req.method === "GET" && req.url === "/debug/step-snapshot/latest") {
            const snapshot = StepSnapshotStore.getLatest();
            if (snapshot) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(snapshot));
            }
            else {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "No step snapshot available" }));
            }
            return;
        }
        if (req.method === "GET" && req.url === "/debug/step-snapshot/session") {
            const snapshots = StepSnapshotStore.getSessionSnapshots();
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(snapshots));
            return;
        }
        if (req.method === "POST" && req.url === "/debug/step-snapshot/reset") {
            StepSnapshotStore.resetSession();
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "ok", message: "Step snapshot session reset" }));
            return;
        }
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({
            status: "engine-error",
            message: "Route not found.",
        }));
    });
    return {
        start() {
            return new Promise((resolve) => {
                server.listen(port, () => {
                    const address = server.address();
                    const actualPort = typeof address === "object" && address && "port" in address
                        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            address.port
                        : port;
                    logInfo(`[EngineHttpServer] Listening on http://localhost:${actualPort}/api/entry-step`);
                    resolve(actualPort);
                });
            });
        },
        stop() {
            return new Promise((resolve, reject) => {
                server.close((err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    logInfo("[EngineHttpServer] Stopped.");
                    resolve();
                });
            });
        },
    };
}
function sendJson(res, statusCode, payload) {
    res.statusCode = statusCode;
    // CORS headers are already set in the request handler
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
}
