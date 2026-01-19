import { NextFunction, Request, Response } from "express";
import { injectable } from "tsyringe";
import type { AuthService } from "../../modules/auth/AuthService.js";
import type { AuthToken } from "../../types/user.types.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthToken;
    }
  }
}

@injectable()
export class AuthMiddleware {
  private readonly publicPaths: Set<string> = new Set(["/health", "/auth/login", "/auth/register"]);

  constructor(private readonly authService: AuthService) {}

  /**
   * Check if a path is public (no auth required).
   */
  isPublicPath(path: string): boolean {
    return this.publicPaths.has(path);
  }

  /**
   * Express middleware handler
   */
  handle = (req: Request, res: Response, next: NextFunction): void => {
    // Skip auth for public paths
    if (this.isPublicPath(req.path)) {
      next();
      return;
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const tokenString = authHeader.slice(7);
    const token = this.authService.validateToken(tokenString);

    if (!token) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    // Attach user to request
    req.user = token;
    next();
  };
}
