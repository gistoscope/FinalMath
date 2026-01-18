/**
 * EngineHttpServer.ts
 *
 * Main HTTP server class for the Engine API.
 * Uses class-based architecture with separation of concerns.
 */

import http, {
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

import type { Logger } from "pino";

import type { HandlerDeps } from "../server/HandlerPostEntryStep.js";
import { CorsMiddleware } from "./middleware/CorsMiddleware.js";
import { ApiRouter } from "./routes/ApiRouter.js";
import type { BaseRouter } from "./routes/BaseRouter.js";
import { DebugRouter } from "./routes/DebugRouter.js";
import { HttpUtils } from "./utils/HttpUtils.js";

export interface EngineHttpServerOptions {
  port: number;
  handlerDeps: HandlerDeps;
  logger?: Logger;
}

export interface IEngineHttpServer {
  start(): Promise<number>;
  stop(): Promise<void>;
}

/**
 * Engine HTTP Server implementation.
 * Coordinates routers and middleware to handle incoming requests.
 */
export class EngineHttpServer implements IEngineHttpServer {
  private readonly port: number;
  private readonly handlerDeps: HandlerDeps;
  private readonly logger?: Logger;
  private readonly server: Server;
  private readonly corsMiddleware: CorsMiddleware;
  private readonly routers: BaseRouter[];

  constructor(options: EngineHttpServerOptions) {
    this.port = options.port;
    this.handlerDeps = options.handlerDeps;
    this.logger = options.logger;

    // Initialize middleware
    this.corsMiddleware = new CorsMiddleware();

    // Initialize routers
    const routerDeps = {
      handlerDeps: this.handlerDeps,
      logger: this.logger,
    };

    this.routers = [new ApiRouter(routerDeps), new DebugRouter(routerDeps)];

    // Create HTTP server
    this.server = http.createServer(this.handleRequest.bind(this));
  }

  /**
   * Main request handler.
   */
  private async handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    try {
      // Apply CORS headers
      this.corsMiddleware.applyHeaders(res);

      // Handle preflight
      if (this.corsMiddleware.handlePreflight(req.method ?? "GET", res)) {
        return;
      }

      const url = HttpUtils.extractUrlPath(req);

      // Try each router
      for (const router of this.routers) {
        const handled = await router.handle(req, res, url);
        if (handled) {
          return;
        }
      }

      // No router handled the request
      HttpUtils.sendNotFound(res);
    } catch (error) {
      this.logError(error, "Unhandled error in request handler");
      HttpUtils.sendEngineError(res, 500);
    }
  }

  /**
   * Start the server.
   */
  start(): Promise<number> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        const address = this.server.address();
        const actualPort =
          typeof address === "object" && address && "port" in address
            ? (address as { port: number }).port
            : this.port;

        this.logInfo(
          `[EngineHttpServer] Listening on http://localhost:${actualPort}/api/entry-step`,
        );

        resolve(actualPort);
      });
    });
  }

  /**
   * Stop the server.
   */
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        this.logInfo("[EngineHttpServer] Stopped.");
        resolve();
      });
    });
  }

  /**
   * Log an info message.
   */
  private logInfo(msg: string): void {
    if (this.logger) {
      this.logger.info(msg);
    } else {
      console.log(msg);
    }
  }

  /**
   * Log an error.
   */
  private logError(error: unknown, msg: string): void {
    if (this.logger) {
      this.logger.error({ err: error }, msg);
    } else {
      console.error(msg, error);
    }
  }
}

/**
 * Factory function to create an engine HTTP server.
 * Maintains backward compatibility with the original API.
 */
export function createEngineHttpServer(
  options: EngineHttpServerOptions,
): IEngineHttpServer {
  return new EngineHttpServer(options);
}
