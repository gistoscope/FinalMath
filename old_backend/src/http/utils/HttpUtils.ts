/**
 * HttpUtils Class
 *
 * Utility functions for HTTP request/response handling.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { singleton } from "tsyringe";

/**
 * HttpUtils - HTTP utility functions
 */
@singleton()
export class HttpUtils {
  /**
   * Parse JSON body from request.
   */
  async parseJsonBody<T>(req: IncomingMessage): Promise<T | null> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];

      req.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      req.on("end", () => {
        try {
          const body = Buffer.concat(chunks).toString("utf-8");
          if (!body) {
            resolve(null);
            return;
          }
          const parsed = JSON.parse(body) as T;
          resolve(parsed);
        } catch {
          resolve(null);
        }
      });

      req.on("error", () => {
        resolve(null);
      });
    });
  }

  /**
   * Send a JSON response.
   */
  sendJson(res: ServerResponse, status: number, data: unknown): void {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(data));
  }

  /**
   * Send a 404 Not Found response.
   */
  sendNotFound(res: ServerResponse): void {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Not Found" }));
  }

  /**
   * Send an engine error response.
   */
  sendEngineError(res: ServerResponse, status: number): void {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        ok: false,
        error: "engine-error",
        status,
      }),
    );
  }

  /**
   * Extract URL path from request.
   */
  extractUrlPath(req: IncomingMessage): string {
    const url = req.url || "/";
    const questionMarkIndex = url.indexOf("?");
    return questionMarkIndex === -1 ? url : url.slice(0, questionMarkIndex);
  }

  /**
   * Extract query parameters from request.
   */
  extractQueryParams(req: IncomingMessage): Record<string, string> {
    const url = req.url || "/";
    const questionMarkIndex = url.indexOf("?");

    if (questionMarkIndex === -1) {
      return {};
    }

    const queryString = url.slice(questionMarkIndex + 1);
    const params: Record<string, string> = {};

    for (const pair of queryString.split("&")) {
      const [key, value] = pair.split("=");
      if (key) {
        params[decodeURIComponent(key)] = value
          ? decodeURIComponent(value)
          : "";
      }
    }

    return params;
  }
}
