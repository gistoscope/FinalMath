/**
 * BaseRouter Class
 *
 * Base class for HTTP routers.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { HttpUtils } from "../utils/HttpUtils.js";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  body?: unknown,
) => Promise<void>;

interface Route {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
}

export interface RouterDeps {
  log?: (message: string) => void;
}

/**
 * BaseRouter - Base class for all routers
 */
export abstract class BaseRouter {
  protected readonly routes: Route[] = [];
  protected readonly log: (message: string) => void = console.log;
  constructor(private readonly httpUtils: HttpUtils) {}

  /**
   * Register routes - to be implemented by subclasses.
   */
  protected abstract registerRoutes(): void;

  /**
   * Register a GET route.
   */
  protected get(path: string, handler: RouteHandler): void {
    this.routes.push({ method: "GET", path, handler });
  }

  /**
   * Register a POST route.
   */
  protected post(path: string, handler: RouteHandler): void {
    this.routes.push({ method: "POST", path, handler });
  }

  /**
   * Register a PUT route.
   */
  protected put(path: string, handler: RouteHandler): void {
    this.routes.push({ method: "PUT", path, handler });
  }

  /**
   * Register a DELETE route.
   */
  protected delete(path: string, handler: RouteHandler): void {
    this.routes.push({ method: "DELETE", path, handler });
  }

  /**
   * Handle an incoming request.
   * Returns true if handled, false otherwise.
   */
  async handle(
    req: IncomingMessage,
    res: ServerResponse,
    url: string,
  ): Promise<boolean> {
    const method = req.method as HttpMethod;

    for (const route of this.routes) {
      if (route.method === method && this.matchPath(route.path, url)) {
        try {
          let body: unknown = undefined;
          if (method === "POST" || method === "PUT" || method === "PATCH") {
            body = await this.httpUtils.parseJsonBody(req);
          }
          await route.handler(req, res, body);
          return true;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          this.log(`[Router] Handler error: ${message}`);
          this.httpUtils.sendEngineError(res, 500);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Match a path pattern against a URL.
   */
  protected matchPath(pattern: string, url: string): boolean {
    // Simple exact match for now
    // Could be extended to support path parameters
    return pattern === url;
  }
}
