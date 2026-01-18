import { injectable } from "tsyringe";
import type { DebugController } from "../controllers/DebugController.js";
import { BaseRouter } from "./BaseRouter.js";

@injectable()
export class DebugRouter extends BaseRouter {
  constructor(private readonly controller: DebugController) {
    super();
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
