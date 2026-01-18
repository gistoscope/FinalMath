/**
 * Application Class
 *
 * Main application bootstrap class that wires all components together.
 *
 * Responsibilities:
 *  - Initialize all services
 *  - Configure dependency injection
 *  - Start the HTTP server
 */

import type { IHttpServer } from "./http/HttpServer.js";
import { HttpServer } from "./http/HttpServer.js";

// Core
import { InvariantLoader } from "./core/invariants/InvariantLoader.js";
import { InvariantRegistry } from "./core/invariants/InvariantRegistry.js";
import { StepOrchestrator } from "./core/orchestrator/StepOrchestrator.js";
import { StepPolicy } from "./core/stepmaster/StepPolicy.js";

// Modules
import { AuthService } from "./modules/auth/AuthService.js";
import { SessionService } from "./modules/session/SessionService.js";
import { JsonFileStorage } from "./modules/storage/JsonFileStorage.js";
import type { StorageService } from "./modules/storage/StorageService.js";

// HTTP
import { ApiController } from "./http/controllers/ApiController.js";
import { AuthController } from "./http/controllers/AuthController.js";
import { DebugController } from "./http/controllers/DebugController.js";
import { ApiRouter } from "./http/routes/ApiRouter.js";
import { AuthRouter } from "./http/routes/AuthRouter.js";
import { DebugRouter } from "./http/routes/DebugRouter.js";

export interface ApplicationConfig {
  port?: number;
  dataDir?: string;
  coursesDir?: string;
  jwtSecret?: string;
  log?: (message: string) => void;
}

/**
 * Application - Main application bootstrap
 */
export class Application {
  private readonly config: Required<ApplicationConfig>;
  private readonly log: (message: string) => void;

  // Services
  private storage!: StorageService;
  private authService!: AuthService;
  private sessionService!: SessionService;
  private invariantRegistry!: InvariantRegistry;
  private orchestrator!: StepOrchestrator;

  // HTTP Server
  private httpServer!: IHttpServer;

  constructor(config: ApplicationConfig) {
    this.config = {
      port: config.port || 4201,
      dataDir: config.dataDir || "data",
      coursesDir: config.coursesDir || "config/courses",
      jwtSecret: config.jwtSecret || process.env.JWT_SECRET || "",
      log: config.log || console.log,
    };
    this.log = this.config.log;
  }

  /**
   * Initialize all services and configure the application.
   */
  async initialize(): Promise<void> {
    this.log("[Application] Initializing...");

    // 1. Initialize Storage
    this.storage = new JsonFileStorage({ dataDir: this.config.dataDir });
    this.log("[Application] Storage initialized");

    // 2. Initialize Auth Service
    this.authService = new AuthService({
      storage: this.storage,
      secretKey: this.config.jwtSecret,
      log: this.log,
    });
    await this.authService.init();
    this.log("[Application] Auth service initialized");

    // 3. Initialize Session Service
    this.sessionService = new SessionService({
      storage: this.storage,
      log: this.log,
    });
    await this.sessionService.init();
    this.log("[Application] Session service initialized");

    // 4. Load Invariants
    const loader = new InvariantLoader({ basePath: process.cwd() });
    const loadResult = loader.loadFromDirectory(this.config.coursesDir);
    if (loadResult.errors.length > 0) {
      this.log(
        `[Application] Invariant loading warnings: ${loadResult.errors.join(", ")}`,
      );
    }
    this.invariantRegistry = loadResult.registry;
    this.log("[Application] Invariants loaded");

    // 5. Initialize Orchestrator
    this.orchestrator = new StepOrchestrator({
      log: this.log,
      getHistory: async (sessionId, userId, userRole) =>
        this.sessionService.getHistory(sessionId, userId, userRole as any),
      updateHistory: async (sessionId, history) =>
        this.sessionService.updateHistory(sessionId, history),
    });
    this.log("[Application] Orchestrator initialized");

    // 6. Setup HTTP Server
    this.setupHttpServer();
    this.log("[Application] HTTP server configured");
  }

  private setupHttpServer(): void {
    // Create controllers
    const apiController = new ApiController({
      orchestrator: this.orchestrator,
      orchestratorContext: {
        invariantRegistry: this.invariantRegistry,
        policy: StepPolicy.createStudentPolicy(),
      },
      log: this.log,
    });

    const debugController = new DebugController({ log: this.log });

    const authController = new AuthController({
      authService: this.authService,
      log: this.log,
    });

    // Create routers
    const routers = [
      new ApiRouter({ apiController, log: this.log }),
      new DebugRouter({ debugController, log: this.log }),
      new AuthRouter({ authController, log: this.log }),
    ];

    // Create server
    this.httpServer = new HttpServer({
      port: this.config.port,
      routers,
      log: this.log,
      enableCors: true,
      enableLogging: true,
    });
  }

  /**
   * Start the application.
   */
  async start(): Promise<number> {
    const port = await this.httpServer.start();
    this.log(`[Application] Started on port ${port}`);
    return port;
  }

  /**
   * Stop the application.
   */
  async stop(): Promise<void> {
    await this.httpServer.stop();
    this.log("[Application] Stopped");
  }

  // Getters for testing/debugging
  getAuthService(): AuthService {
    return this.authService;
  }

  getSessionService(): SessionService {
    return this.sessionService;
  }

  getInvariantRegistry(): InvariantRegistry {
    return this.invariantRegistry;
  }

  getOrchestrator(): StepOrchestrator {
    return this.orchestrator;
  }
}

/**
 * Factory function to create and initialize an application.
 */
export async function createApplication(
  config: ApplicationConfig,
): Promise<Application> {
  const app = new Application(config);
  await app.initialize();
  return app;
}
