/**
 * Orchestrator Controller
 *
 * Handles the V5 orchestrator endpoints.
 */

import { Request, Response } from "express";
import { autoInjectable } from "tsyringe";

import { Controller } from "../../core/decorator/controller.decorator";
import { UseDTO } from "../../core/decorator/dto.decorator";
import { POST } from "../../core/decorator/routes.decorator";

import { OrchestratorStepV5Dto } from "./dtos/orchestrator-step.dto";
import { OrchestratorService } from "./orchestrator.service";

@autoInjectable()
@Controller("/api/orchestrator/v5")
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  /**
   * POST /api/orchestrator/v5/step
   *
   * Execute a step using the V5 orchestrator.
   * Returns the full OrchestratorStepResult with history, debugInfo, and engineResult.
   */
  @POST("/step")
  @UseDTO(OrchestratorStepV5Dto)
  async step(req: Request, res: Response) {
    const dto: OrchestratorStepV5Dto = req.body;
    const result = await this.orchestratorService.handleStepV5(dto);

    return res.status(200).json(result);
  }
}
