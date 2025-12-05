/**
 * engineHttpServer.ts
 *
 * Thin HTTP wrapper around HandlerPostEntryStep for Backend API v1.
 */

import http, {
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import {
  HandlerPostEntryStep,
  type HandlerDeps,
} from "./HandlerPostEntryStep.js";
import {
  HandlerPostUndoStep,
} from "./HandlerPostUndoStep.js";
import {
  handlePostHintRequest,
} from "./HandlerPostHintRequest.js";
import { handleGetStudentProgress } from "./HandlerReporting.js";
import type { EngineStepResponse, UndoStepResponse, HintResponse } from "../protocol/backend-step.types.js";

import type { Logger } from "pino";

export interface EngineHttpServerOptions {
  port: number;
  handlerDeps: HandlerDeps;
  logger?: Logger;
}

export interface EngineHttpServer {
  start(): Promise<number>;
  stop(): Promise<void>;
}

export function createEngineHttpServer(
  options: EngineHttpServerOptions,
): EngineHttpServer {
  const { port, handlerDeps, logger } = options;
  // Fallback if no logger provided (though we expect one)
  const logInfo = (msg: string) => logger ? logger.info(msg) : console.log(msg);
  const logError = (obj: object, msg: string) => logger ? logger.error(obj, msg) : console.error(msg, obj);

  const server = http.createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
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
      if (req.method === "POST" && (url === "/api/entry-step" || url === "/engine/step" || url === "/api/undo-step" || url === "/api/hint-request" || url === "/api/register" || url === "/api/login")) {
        let body = "";

        req.on("data", (chunk: Buffer | string) => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          let parsedBody: unknown;

          try {
            parsedBody = body.length > 0 ? JSON.parse(body) : null;
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Invalid JSON in request body.";

            logError({ err: error }, `[EngineHttpServer] JSON parse error: ${message}`);

            const errorResponse: EngineStepResponse = {
              status: "engine-error",
              expressionLatex: "", // Cannot echo back if JSON is invalid
            };

            sendJson(res, 400, errorResponse);
            return;
          }

          try {
            let response: unknown;

            // POST /api/entry-step (TzV1.1)
            // We also support /engine/step for backward compatibility if needed,
            // but TZ specifies /api/entry-step.
            if (url === "/api/entry-step" || url === "/engine/step") {
              response = await HandlerPostEntryStep(
                parsedBody,
                handlerDeps,
              );
            }
            else if (url === "/api/undo-step") {
              response = await HandlerPostUndoStep(parsedBody, handlerDeps);
            }
            else if (url === "/api/hint-request") {
              response = await handlePostHintRequest(parsedBody, handlerDeps);
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
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Unexpected error in HTTP server.";

            logError({ err: error }, `[EngineHttpServer] Unhandled error: ${message}`);

            const errorResponse: EngineStepResponse = {
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

      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          status: "engine-error",
          message: "Route not found.",
        }),
      );
    },
  );

  return {
    start(): Promise<number> {
      return new Promise((resolve) => {
        server.listen(port, () => {
          const address = server.address();
          const actualPort =
            typeof address === "object" && address && "port" in address
              ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (address as any).port
              : port;

          logInfo(
            `[EngineHttpServer] Listening on http://localhost:${actualPort}/api/entry-step`,
          );

          resolve(actualPort);
        });
      });
    },

    stop(): Promise<void> {
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

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  // CORS headers are already set in the request handler
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}