/**
 * AuthRouter Class
 *
 * Router for authentication endpoints.
 */

import type { AuthController } from "../controllers/AuthController.js";
import { BaseRouter, type RouterDeps } from "./BaseRouter.js";

export interface AuthRouterDeps extends RouterDeps {
  authController: AuthController;
}

/**
 * AuthRouter - Routes for authentication
 */
export class AuthRouter extends BaseRouter {
  private readonly controller: AuthController;

  constructor(deps: AuthRouterDeps) {
    super(deps);
    this.controller = deps.authController;
    this.registerRoutes();
  }

  protected registerRoutes(): void {
    this.post("/auth/login", this.controller.handleLogin.bind(this.controller));
    this.post(
      "/auth/register",
      this.controller.handleRegister.bind(this.controller),
    );
    this.post(
      "/auth/validate",
      this.controller.handleValidateToken.bind(this.controller),
    );
  }
}
