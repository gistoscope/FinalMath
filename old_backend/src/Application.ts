import { container, injectable } from "tsyringe";
import { registerController } from "./http/core/controller/register-controller.js";
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
}

export async function createApplication(): Promise<Application> {
  const app = container.resolve(Application);
  await app.initialize();
  return app;
}
