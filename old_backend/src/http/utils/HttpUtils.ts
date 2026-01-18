/**
 * HttpUtils.ts
 *
 * Common HTTP utilities for request/response handling.
 */

import type { IncomingMessage, ServerResponse } from "node:http";

import type { EngineStepResponse } from "../../protocol/backend-step.types.js";

export interface RequestContext {
  req: IncomingMessage;
  res: ServerResponse;
  url: string;
  method: string;
  body?: unknown;
}

/**
 * HTTP utility methods for the engine server.
 */
export class HttpUtils {
  /**
   * Send a JSON response.
   */
  static sendJson(
    res: ServerResponse,
    statusCode: number,
    payload: unknown,
  ): void {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
  }

  /**
   * Send an error response in the engine format.
   */
  static sendEngineError(
    res: ServerResponse,
    statusCode: number,
    message?: string,
  ): void {
    const errorResponse: EngineStepResponse = {
      status: "engine-error",
      expressionLatex: "",
    };

    if (message) {
      (errorResponse as EngineStepResponse & { message?: string }).message =
        message;
    }

    HttpUtils.sendJson(res, statusCode, errorResponse);
  }

  /**
   * Send a 404 Not Found response.
   */
  static sendNotFound(res: ServerResponse, message = "Route not found."): void {
    HttpUtils.sendJson(res, 404, {
      status: "engine-error",
      message,
    });
  }

  /**
   * Parse the request body as JSON.
   */
  static parseBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let body = "";

      req.on("data", (chunk: Buffer | string) => {
        body += chunk.toString();
      });

      req.on("end", () => {
        try {
          const parsed = body.length > 0 ? JSON.parse(body) : null;
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      });

      req.on("error", reject);
    });
  }

  /**
   * Extract URL path from request.
   */
  static extractUrlPath(req: IncomingMessage): string {
    const rawUrl = req.url ?? "/";
    const [urlPath] = rawUrl.split("?", 2);
    return urlPath || "/";
  }
}
