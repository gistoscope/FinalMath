import type { IncomingMessage, ServerResponse } from "node:http";
import { injectable } from "tsyringe";
import type { AuthService } from "../../modules/auth/AuthService.js";
import type { AuthToken } from "../../types/user.types.js";
import { HttpUtils } from "../utils/HttpUtils.js";

export interface AuthenticatedRequest extends IncomingMessage {
  user?: AuthToken;
}

@injectable()
export class AuthMiddleware {
  private readonly publicPaths: Set<string> = new Set([
    "/health",
    "/auth/login",
    "/auth/register",
  ]);

  constructor(
    private readonly authService: AuthService,
    private readonly httpUtils: HttpUtils,
  ) {}

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
      this.httpUtils.sendJson(res, 401, { error: "Unauthorized" });
      return false;
    }

    const tokenString = authHeader.slice(7);
    const token = this.authService.validateToken(tokenString);

    if (!token) {
      this.httpUtils.sendJson(res, 401, { error: "Invalid token" });
      return false;
    }

    // Attach user to request
    req.user = token;
    return true;
  }
}
