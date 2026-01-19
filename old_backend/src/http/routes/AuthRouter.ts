import { Application, Router } from "express";
import { injectable } from "tsyringe";
import { AuthController } from "../controllers/AuthController.js";
import { IRouter } from "../interfaces.js";

@injectable()
export class AuthRouter implements IRouter {
  constructor(private readonly controller: AuthController) {}

  register(app: Application): void {
    const router = Router();

    router.post("/auth/login", this.controller.handleLogin.bind(this.controller));
    router.post("/auth/register", this.controller.handleRegister.bind(this.controller));
    router.post("/auth/validate", this.controller.handleValidateToken.bind(this.controller));

    app.use(router);
  }
}
