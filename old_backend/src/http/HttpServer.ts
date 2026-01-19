/**
 * HttpServer Class
 *
 * Main HTTP server for the Engine API.
 * Coordinates routers and middleware to handle incoming requests.
 */

import http, {
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

import { container, inject, injectable } from "tsyringe";
import { HTTP_SERVER_PORT, HTTP_SERVER_ROUTERS } from "../registry.js";
import { CorsMiddleware } from "./middleware/CorsMiddleware.js";
import { LoggerMiddleware } from "./middleware/LoggerMiddleware.js";
import type { BaseRouter } from "./routes/BaseRouter.js";
import { HttpUtils } from "./utils/HttpUtils.js";

export interface IHttpServer {
  start(): Promise<number>;
  stop(): Promise<void>;
}

/**
 * HttpServer - Main HTTP server implementation
 */
@injectable()
export class HttpServer implements IHttpServer {
  private readonly log: (message: string) => void = console.log;
  private readonly server: Server;

  constructor(
    private readonly corsMiddleware: CorsMiddleware,
    private readonly loggerMiddleware: LoggerMiddleware,
    @inject(HTTP_SERVER_ROUTERS)
    private readonly routers: BaseRouter[],
    @inject(HTTP_SERVER_PORT) private readonly port: number,
    private readonly httpUtils: HttpUtils,
  ) {
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
    const startTime = this.loggerMiddleware.logRequest(req);

    try {
      // Apply CORS headers
      this.corsMiddleware.applyHeaders(res);

      // Handle preflight
      if (this.corsMiddleware.handlePreflight(req.method ?? "GET", res)) {
        return;
      }

      const url = this.httpUtils.extractUrlPath(req);

      // Try each router
      for (const router of this.routers) {
        const handled = await router.handle(req, res, url);
        if (handled) {
          this.loggerMiddleware.logResponse(req, res, startTime);
          return;
        }
      }

      // No router handled the request
      this.httpUtils.sendNotFound(res);
      this.loggerMiddleware.logResponse(req, res, startTime);
    } catch (error) {
      this.log(
        `[HttpServer] Unhandled error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      this.httpUtils.sendEngineError(res, 500);
      this.loggerMiddleware.logResponse(req, res, startTime);
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

        this.log(`[HttpServer] Listening on http://localhost:${actualPort}/`);

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
        this.log("[HttpServer] Stopped.");
        resolve();
      });
    });
  }
}

/**
 * Factory function to create an HTTP server.
 */
export function createHttpServer(): IHttpServer {
  return container.resolve(HttpServer);
}
