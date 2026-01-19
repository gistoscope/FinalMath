/**
 * CorsMiddleware Class
 *
 * Handles CORS headers and preflight requests.
 */

import type { ServerResponse } from "node:http";
import { injectable } from "tsyringe";

export interface CorsConfig {
  allowOrigin?: string;
  allowMethods?: string[];
  allowHeaders?: string[];
  maxAge?: number;
}

/**
 * CorsMiddleware - CORS handling
 */
@injectable()
export class CorsMiddleware {
  private readonly config: Required<CorsConfig> = {
    allowOrigin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    maxAge: 86400,
  };

  /**
   * Apply CORS headers to a response.
   */
  applyHeaders(res: ServerResponse): void {
    res.setHeader("Access-Control-Allow-Origin", this.config.allowOrigin);
    res.setHeader("Access-Control-Allow-Methods", this.config.allowMethods.join(", "));
    res.setHeader("Access-Control-Allow-Headers", this.config.allowHeaders.join(", "));
    res.setHeader("Access-Control-Max-Age", String(this.config.maxAge));
  }

  /**
   * Handle preflight OPTIONS request.
   * Returns true if handled (was OPTIONS), false otherwise.
   */
  handlePreflight(method: string, res: ServerResponse): boolean {
    if (method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return true;
    }
    return false;
  }
}
