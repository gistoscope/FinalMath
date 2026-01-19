import cors from "cors";
import express, { Express } from "express";
import http from "node:http";
import { inject, injectable } from "tsyringe";
import { HTTP_SERVER_PORT } from "../registry.js";

export interface IHttpServer {
  start(): Promise<number>;
  stop(): Promise<void>;
}

/**
 * HttpServer - Express-based HTTP server
 */
@injectable()
export class HttpServer implements IHttpServer {
  readonly app: Express;
  private server: http.Server | null = null;

  constructor(@inject(HTTP_SERVER_PORT) private readonly port: number) {
    this.app = express();
    this.setupMiddleware();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());

    // Simple logger
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on("finish", () => {
        const duration = Date.now() - start;
        console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
      });
      next();
    });
  }

  /**
   * Start the server.
   */
  start(): Promise<number> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`[HttpServer] Listening on http://localhost:${this.port}/`);
        resolve(this.port);
      });
    });
  }

  /**
   * Stop the server.
   */
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }
      this.server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log("[HttpServer] Stopped.");
        resolve();
      });
    });
  }
}

export function createHttpServer(): IHttpServer {
  // Container resolution is handled in Application.ts
  throw new Error("Use DI container to resolve HttpServer");
}
