/**
 * AuthRouter Class
 *
 * Router for authentication endpoints.
 */

import { injectable } from "tsyringe";
import type { AuthController } from "../controllers/AuthController.js";
import { BaseRouter } from "./BaseRouter.js";

@injectable()
export class AuthRouter extends BaseRouter {
  constructor(private readonly controller: AuthController) {
    super();
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
