import { Response } from "express";
import { container, injectable } from "tsyringe";
import { registerController } from "./http/core/controller/register-controller.js";
import { HttpException, ValidationException } from "./http/core/errors/errors.js";
import { HttpServer } from "./http/HttpServer.js";
import { ApiController, AuthController, DebugController } from "./http/index.js";
import { AuthService } from "./modules/auth/AuthService.js";
import { OrchestratorController } from "./modules/orchestrator/orchestrator.controller.js";
import { SessionService } from "./modules/session/SessionService.js";

@injectable()
export class Application {
  constructor(
    private readonly authService: AuthService,
    private sessionService: SessionService,
    private readonly httpServer: HttpServer
  ) {}

  async initialize(): Promise<void> {
    await this.authService.init();
    await this.sessionService.init();

    this.setupHttpServer();
  }

  private setupHttpServer(): void {
    registerController(this.httpServer.app, [
      ApiController,
      DebugController,
      AuthController,
      OrchestratorController,
    ]);
    this.handleErrors();
  }

  async start(): Promise<number> {
    await this.initialize();
    const port = await this.httpServer.start();
    console.log(`[Application] Started on port ${port}`);
    return port;
  }

  async stop(): Promise<void> {
    await this.httpServer.stop();
    console.log("[Application] Stopped");
  }

  handleErrors(): void {
    console.log("handler errors");

    // 404 not found handler
    this.httpServer.app.use((_req, res: Response) => {
      res.status(404).json({ message: "You requested resource not found!" });
    });

    // 500 internal server error handler
    this.httpServer.app.use((err: any, _req: any, res: Response, _next: any) => {
      if (err instanceof ValidationException) {
        return res.status(err.statusCode).json({
          message: err.message,
          errors: err.all,
        });
      }
      if (err instanceof HttpException) {
        return res.status(err.statusCode).json({ message: err.message });
      }

      res.status(500).json({ message: "Internal Server Error" });
    });
  }
}

export async function createApplication(): Promise<Application> {
  const app = container.resolve(Application);
  await app.initialize();
  return app;
}
