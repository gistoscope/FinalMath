/**
 * LoggerMiddleware Class
 *
 * Logs incoming requests and response times.
 */

import type { IncomingMessage, ServerResponse } from "node:http";

export interface LoggerMiddlewareConfig {
  log?: (message: string) => void;
  enabled?: boolean;
}

/**
 * LoggerMiddleware - Request logging
 */
export class LoggerMiddleware {
  private readonly log: (message: string) => void;
  private readonly enabled: boolean;

  constructor(config?: LoggerMiddlewareConfig) {
    this.log = config?.log || console.log;
    this.enabled = config?.enabled !== false;
  }

  /**
   * Log an incoming request.
   * Returns the start time for measuring response time.
   */
  logRequest(req: IncomingMessage): number {
    if (!this.enabled) return Date.now();

    const method = req.method || "GET";
    const url = req.url || "/";
    this.log(`[HTTP] --> ${method} ${url}`);

    return Date.now();
  }

  /**
   * Log the response.
   */
  logResponse(
    req: IncomingMessage,
    res: ServerResponse,
    startTime: number,
  ): void {
    if (!this.enabled) return;

    const method = req.method || "GET";
    const url = req.url || "/";
    const status = res.statusCode;
    const duration = Date.now() - startTime;

    this.log(`[HTTP] <-- ${method} ${url} ${status} (${duration}ms)`);
  }
}
