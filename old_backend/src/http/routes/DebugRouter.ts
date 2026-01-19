import { Application, Router } from "express";
import { injectable } from "tsyringe";
import { DebugController } from "../controllers/DebugController.js";
import { IRouter } from "../interfaces.js";

@injectable()
export class DebugRouter implements IRouter {
  constructor(private readonly controller: DebugController) {}

  register(app: Application): void {
    const router = Router();

    router.post("/debug/ast", this.controller.handleAstDebug.bind(this.controller));
    router.post("/debug/mapmaster", this.controller.handleMapMasterDebug.bind(this.controller));
    router.post("/debug/step", this.controller.handleStepDebug.bind(this.controller));
    router.get("/debug/trace", this.controller.handleTraceDebug.bind(this.controller));

    app.use(router);
  }
}
