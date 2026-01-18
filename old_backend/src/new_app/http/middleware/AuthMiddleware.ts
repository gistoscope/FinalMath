/**
 * AuthMiddleware Class
 *
 * Validates authentication tokens on protected routes.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import type { AuthService } from "../../modules/auth/AuthService.js";
import type { AuthToken } from "../../types/user.types.js";
import { HttpUtils } from "../utils/HttpUtils.js";

export interface AuthMiddlewareConfig {
  authService: AuthService;
  publicPaths?: string[];
}

export interface AuthenticatedRequest extends IncomingMessage {
  user?: AuthToken;
}

/**
 * AuthMiddleware - Authentication validation
 */
export class AuthMiddleware {
  private readonly authService: AuthService;
  private readonly publicPaths: Set<string>;

  constructor(config: AuthMiddlewareConfig) {
    this.authService = config.authService;
    this.publicPaths = new Set(
      config.publicPaths || ["/health", "/auth/login", "/auth/register"],
    );
  }

  /**
   * Check if a path is public (no auth required).
   */
  isPublicPath(path: string): boolean {
    return this.publicPaths.has(path);
  }

  /**
   * Authenticate a request.
   * Returns true if authenticated or public, false if unauthorized.
   */
  authenticate(
    req: AuthenticatedRequest,
    res: ServerResponse,
    path: string,
  ): boolean {
    // Skip auth for public paths
    if (this.isPublicPath(path)) {
      return true;
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      HttpUtils.sendJson(res, 401, { error: "Unauthorized" });
      return false;
    }

    const tokenString = authHeader.slice(7);
    const token = this.authService.validateToken(tokenString);

    if (!token) {
      HttpUtils.sendJson(res, 401, { error: "Invalid token" });
      return false;
    }

    // Attach user to request
    req.user = token;
    return true;
  }
}
