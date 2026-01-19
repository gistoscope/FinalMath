/**
 * BaseController Class
 *
 * Base class for HTTP controllers.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { type HttpUtils } from "../utils/HttpUtils.js";

export interface ControllerDependencies {
  log?: (message: string) => void;
}

export abstract class BaseController {
  constructor(private readonly httpUtils: HttpUtils) {}

  protected sendJson(res: ServerResponse, status: number, data: unknown): void {
    this.httpUtils.sendJson(res, status, data);
  }

  protected sendError(
    res: ServerResponse,
    status: number,
    message: string,
  ): void {
    this.httpUtils.sendJson(res, status, { error: message });
  }

  protected async parseBody<T>(req: IncomingMessage): Promise<T | null> {
    return this.httpUtils.parseJsonBody<T>(req);
  }
}
