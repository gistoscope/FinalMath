import { container, injectable } from "tsyringe";
import type { IHttpServer } from "./http/HttpServer.js";
import { HttpServer } from "./http/HttpServer.js";
import { ApiRouter } from "./http/routes/ApiRouter.js";
import { AuthRouter } from "./http/routes/AuthRouter.js";
import { DebugRouter } from "./http/routes/DebugRouter.js";
import { AuthService } from "./modules/auth/AuthService.js";
import { SessionService } from "./modules/session/SessionService.js";
import { registerRouters } from "./registry.js";

@injectable()
export class Application {
  private httpServer!: IHttpServer;

  constructor(
    private readonly authService: AuthService,
    private sessionService: SessionService,
  ) {}

  async initialize(): Promise<void> {
    await this.authService.init();
    await this.sessionService.init();

    this.setupHttpServer();
  }

  private setupHttpServer(): void {
    registerRouters([ApiRouter, DebugRouter, AuthRouter]);

    // Create server
    this.httpServer = container.resolve(HttpServer);
  }

  async start(): Promise<number> {
    this.initialize();
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
