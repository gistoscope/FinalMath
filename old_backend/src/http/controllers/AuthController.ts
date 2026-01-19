/**
 * AuthController Class
 *
 * Handles authentication endpoints.
 */

import type { Request, Response } from "express";
import { injectable } from "tsyringe";
import { AuthService } from "../../modules/auth/AuthService.js";

@injectable()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login - User login.
   */
  async handleLogin(req: Request, res: Response): Promise<void> {
    const body = req.body as {
      username?: string;
      password?: string;
    };

    if (!body?.username || !body?.password) {
      res.status(400).json({ error: "Missing username or password" });
      return;
    }

    try {
      const token = await this.authService.login(body.username, body.password);

      if (!token) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const tokenString = this.authService.generateTokenString(token);
      res.status(200).json({
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
      console.log(`[AuthController] Login failed: ${message}`);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * POST /auth/register - User registration.
   */
  async handleRegister(req: Request, res: Response): Promise<void> {
    const body = req.body as {
      username?: string;
      password?: string;
      role?: string;
    };

    if (!body?.username || !body?.password) {
      res.status(400).json({ error: "Missing username or password" });
      return;
    }

    const role = (body.role as "student" | "teacher") || "student";

    try {
      const user = await this.authService.register(body.username, body.password, role);

      res.status(201).json({
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
        res.status(409).json({ error: message });
      } else {
        console.log(`[AuthController] Register failed: ${message}`);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }

  /**
   * POST /auth/validate - Validate token.
   */
  async handleValidateToken(req: Request, res: Response): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid authorization header" });
      return;
    }

    const tokenString = authHeader.slice(7);
    const token = this.authService.validateToken(tokenString);

    if (!token) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    res.status(200).json({
      ok: true,
      user: {
        userId: token.userId,
        username: token.username,
        role: token.role,
      },
    });
  }
}
