/**
 * ApiRouter Class
 *
 * Router for main API endpoints.
 */

import type { ApiController } from "../controllers/ApiController.js";
import { BaseRouter, type RouterDeps } from "./BaseRouter.js";

export interface ApiRouterDeps extends RouterDeps {
  apiController: ApiController;
}

/**
 * ApiRouter - Routes for main API
 */
export class ApiRouter extends BaseRouter {
  private readonly controller: ApiController;

  constructor(deps: ApiRouterDeps) {
    super(deps);
    this.controller = deps.apiController;
    this.registerRoutes();
  }

  protected registerRoutes(): void {
    // Health check
    this.get("/health", this.controller.handleHealth.bind(this.controller));

    // Core engine endpoints
    this.post(
      "/api/entry-step",
      this.controller.handleEntryStep.bind(this.controller),
    );
    this.post(
      "/engine/step",
      this.controller.handleEntryStep.bind(this.controller),
    );
    this.post(
      "/api/undo-step",
      this.controller.handleUndoStep.bind(this.controller),
    );
    this.post(
      "/api/hint-request",
      this.controller.handleHintRequest.bind(this.controller),
    );

    // V5 Orchestrator
    this.post(
      "/api/orchestrator/v5/step",
      this.controller.handleEntryStep.bind(this.controller),
    );
  }
}
