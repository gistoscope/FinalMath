import { Application, Router } from "express";
import { injectable } from "tsyringe";
import { ApiController } from "../controllers/ApiController.js";
import { IRouter } from "../interfaces.js";

@injectable()
export class ApiRouter implements IRouter {
  constructor(private readonly controller: ApiController) {}

  register(app: Application): void {
    const router = Router();

    // Health check
    router.get("/health", this.controller.handleHealth.bind(this.controller));

    // Core engine endpoints
    router.post("/api/entry-step", this.controller.handleEntryStep.bind(this.controller));
    router.post("/engine/step", this.controller.handleEntryStep.bind(this.controller));
    router.post("/api/undo-step", this.controller.handleUndoStep.bind(this.controller));
    router.post("/api/hint-request", this.controller.handleHintRequest.bind(this.controller));

    // V5 Orchestrator
    router.post("/api/orchestrator/v5/step", this.controller.handleEntryStep.bind(this.controller));

    app.use(router);
  }
}
