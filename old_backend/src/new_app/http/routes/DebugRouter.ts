/**
 * DebugRouter Class
 *
 * Router for debug endpoints.
 */

import type { DebugController } from "../controllers/DebugController.js";
import { BaseRouter, type RouterDeps } from "./BaseRouter.js";

export interface DebugRouterDeps extends RouterDeps {
  debugController: DebugController;
}

/**
 * DebugRouter - Routes for debug endpoints
 */
export class DebugRouter extends BaseRouter {
  private readonly controller: DebugController;

  constructor(deps: DebugRouterDeps) {
    super(deps);
    this.controller = deps.debugController;
    this.registerRoutes();
  }

  protected registerRoutes(): void {
    this.post(
      "/debug/ast",
      this.controller.handleAstDebug.bind(this.controller),
    );
    this.post(
      "/debug/mapmaster",
      this.controller.handleMapMasterDebug.bind(this.controller),
    );
    this.post(
      "/debug/step",
      this.controller.handleStepDebug.bind(this.controller),
    );
    this.get(
      "/debug/trace",
      this.controller.handleTraceDebug.bind(this.controller),
    );
  }
}
