import { Controller } from "@/http/core/decorator/controller.decorator.js";
import { UseDTO } from "@/http/core/decorator/dto.decorator.js";
import { GET, POST } from "@/http/core/decorator/routes.decorator.js";
import type { Request, Response } from "express";
import { injectable } from "tsyringe";
import { OrchestratorEntryDTO } from "./dtos/orchestrator-entry.dto.js";
import { OrchestratorService } from "./orchestrator.service.js";

@injectable()
@Controller("/api/orchestrator/v5/")
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @GET("/health")
  async handleHealth(_req: Request, res: Response): Promise<void> {
    res.status(200).json({ message: "healthy" });
  }

  @POST("/step")
  @UseDTO(OrchestratorEntryDTO)
  async handleEntryStep(
    req: Request<any, any, OrchestratorEntryDTO>,
    res: Response
  ): Promise<void> {
    const result = await this.orchestratorService.handleEntry(req.body);
    res.status(200).json(result);
  }
}
