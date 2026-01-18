/**
 * CorsMiddleware.ts
 *
 * CORS handling middleware for the HTTP server.
 */

import type { ServerResponse } from "node:http";

export interface CorsOptions {
  allowedOrigin: string;
  allowedMethods: string[];
  allowedHeaders: string[];
}

const DEFAULT_CORS_OPTIONS: CorsOptions = {
  allowedOrigin: "*",
  allowedMethods: ["POST", "GET", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-trace-id"],
};

/**
 * CORS middleware for handling cross-origin requests.
 */
export class CorsMiddleware {
  private readonly options: CorsOptions;

  constructor(options?: Partial<CorsOptions>) {
    this.options = { ...DEFAULT_CORS_OPTIONS, ...options };
  }

  /**
   * Apply CORS headers to the response.
   */
  applyHeaders(res: ServerResponse): void {
    res.setHeader("Access-Control-Allow-Origin", this.options.allowedOrigin);
    res.setHeader(
      "Access-Control-Allow-Methods",
      this.options.allowedMethods.join(", "),
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      this.options.allowedHeaders.join(", "),
    );
  }

  /**
   * Handle OPTIONS preflight request.
   * @returns true if the request was handled (OPTIONS), false otherwise.
   */
  handlePreflight(method: string, res: ServerResponse): boolean {
    if (method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return true;
    }
    return false;
  }
}
