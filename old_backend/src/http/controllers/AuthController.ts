/**
 * AuthController Class
 *
 * Handles authentication endpoints.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { injectable } from "tsyringe";
import type { AuthService } from "../../modules/auth/AuthService.js";
import { BaseController } from "./BaseController.js";

@injectable()
export class AuthController extends BaseController {
  constructor(private readonly authService: AuthService) {
    super();
  }

  /**
   * POST /auth/login - User login.
   */
  async handleLogin(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.parseBody<{
      username?: string;
      password?: string;
    }>(req);

    if (!body?.username || !body?.password) {
      this.sendError(res, 400, "Missing username or password");
      return;
    }

    try {
      const token = await this.authService.login(body.username, body.password);

      if (!token) {
        this.sendError(res, 401, "Invalid credentials");
        return;
      }

      const tokenString = this.authService.generateTokenString(token);
      this.sendJson(res, 200, {
        ok: true,
        token: tokenString,
        user: {
          userId: token.userId,
          username: token.username,
          role: token.role,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log(`[AuthController] Login failed: ${message}`);
      this.sendError(res, 500, "Internal server error");
    }
  }

  /**
   * POST /auth/register - User registration.
   */
  async handleRegister(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const body = await this.parseBody<{
      username?: string;
      password?: string;
      role?: string;
    }>(req);

    if (!body?.username || !body?.password) {
      this.sendError(res, 400, "Missing username or password");
      return;
    }

    const role = (body.role as "student" | "teacher") || "student";

    try {
      const user = await this.authService.register(
        body.username,
        body.password,
        role,
      );

      this.sendJson(res, 201, {
        ok: true,
        user: {
          userId: user.id,
          username: user.username,
          role: user.role,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("already exists")) {
        this.sendError(res, 409, message);
      } else {
        this.log(`[AuthController] Register failed: ${message}`);
        this.sendError(res, 500, "Internal server error");
      }
    }
  }

  /**
   * POST /auth/validate - Validate token.
   */
  async handleValidateToken(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      this.sendError(res, 401, "Missing or invalid authorization header");
      return;
    }

    const tokenString = authHeader.slice(7);
    const token = this.authService.validateToken(tokenString);

    if (!token) {
      this.sendError(res, 401, "Invalid token");
      return;
    }

    this.sendJson(res, 200, {
      ok: true,
      user: {
        userId: token.userId,
        username: token.username,
        role: token.role,
      },
    });
  }
}
