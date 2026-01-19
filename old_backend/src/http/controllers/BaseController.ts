/**
 * BaseController Class
 *
 * Base class for HTTP controllers.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { HttpUtils } from "../utils/HttpUtils.js";

export interface ControllerDependencies {
  log?: (message: string) => void;
}

/**
 * BaseController - Base class for all controllers
 */
export abstract class BaseController {
  protected readonly log: (message: string) => void = console.log;

  /**
   * Send a JSON response.
   */
  protected sendJson(res: ServerResponse, status: number, data: unknown): void {
    HttpUtils.sendJson(res, status, data);
  }

  /**
   * Send an error response.
   */
  protected sendError(
    res: ServerResponse,
    status: number,
    message: string,
  ): void {
    HttpUtils.sendJson(res, status, { error: message });
  }

  /**
   * Parse request body as JSON.
   */
  protected async parseBody<T>(req: IncomingMessage): Promise<T | null> {
    return HttpUtils.parseJsonBody<T>(req);
  }
}
