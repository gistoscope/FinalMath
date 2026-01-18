/**
 * BaseRouter.ts
 *
 * Base abstract router with common routing utilities.
 */

import type { IncomingMessage, ServerResponse } from "node:http";

import type { Logger } from "pino";

import type { HandlerDeps } from "../../server/HandlerPostEntryStep.js";
import { HttpUtils } from "../utils/HttpUtils.js";

export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  body?: unknown,
) => Promise<void>;

export interface Route {
  method: "GET" | "POST";
  path: string;
  handler: RouteHandler;
}

export interface RouterDeps {
  handlerDeps: HandlerDeps;
  logger?: Logger;
}

/**
 * Base router class with common routing functionality.
 */
export abstract class BaseRouter {
  protected readonly routes: Route[] = [];
  protected readonly handlerDeps: HandlerDeps;
  protected readonly logger?: Logger;

  constructor(deps: RouterDeps) {
    this.handlerDeps = deps.handlerDeps;
    this.logger = deps.logger;
    this.registerRoutes();
  }

  /**
   * Override this method to register routes.
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
   * Check if this router can handle the given request.
   */
  canHandle(method: string, url: string): boolean {
    return this.routes.some(
      (route) => route.method === method && route.path === url,
    );
  }

  /**
   * Handle the request.
   * @returns true if handled, false otherwise.
   */
  async handle(
    req: IncomingMessage,
    res: ServerResponse,
    url: string,
  ): Promise<boolean> {
    const method = req.method ?? "GET";
    const route = this.routes.find(
      (r) => r.method === method && r.path === url,
    );

    if (!route) {
      return false;
    }

    try {
      if (method === "POST") {
        const body = await HttpUtils.parseBody(req);
        await route.handler(req, res, body);
      } else {
        await route.handler(req, res);
      }
      return true;
    } catch (error) {
      this.logError(error, `Error handling ${method} ${url}`);
      HttpUtils.sendEngineError(res, 500);
      return true;
    }
  }

  /**
   * Log an info message.
   */
  protected logInfo(msg: string): void {
    if (this.logger) {
      this.logger.info(msg);
    } else {
      console.log(msg);
    }
  }

  /**
   * Log an error.
   */
  protected logError(error: unknown, msg: string): void {
    if (this.logger) {
      this.logger.error({ err: error }, msg);
    } else {
      console.error(msg, error);
    }
  }
}
