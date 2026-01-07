/**
 * Engine Controller
 *
 * Handles the main student-facing endpoints for the math engine:
 * - POST /api/entry-step - Execute a step on an expression
 * - POST /api/undo-step - Undo the last step
 * - POST /api/hint-request - Get a hint for the current expression
 *
 * These are the primary endpoints called by the Viewer/Adapter in the learning flow.
 */

import { Request, Response } from "express";
import { autoInjectable } from "tsyringe";

import { Controller } from "../../core/decorator/controller.decorator";
import { UseDTO } from "../../core/decorator/dto.decorator";
import { POST } from "../../core/decorator/routes.decorator";

import { EntryStepDto, HintRequestDto, UndoStepDto } from "./dtos";
import { EngineService } from "./engine.service";

@autoInjectable()
@Controller("")
export class EngineController {
  constructor(private readonly engineService: EngineService) {}

  /**
   * POST /api/entry-step
   *
   * Main endpoint for executing a step on a mathematical expression.
   * This is the primary student-facing endpoint.
   */
  @POST("/api/entry-step")
  @UseDTO(EntryStepDto)
  async entryStep(req: Request, res: Response) {
    const dto: EntryStepDto = req.body;
    const result = await this.engineService.handleEntryStep(dto);

    return res.status(200).json(result);
  }

  /**
   * POST /engine/step
   *
   * Legacy endpoint for backward compatibility.
   * Delegates to the same handler as /api/entry-step.
   */
  @POST("/engine/step")
  @UseDTO(EntryStepDto)
  async legacyEntryStep(req: Request, res: Response) {
    const dto: EntryStepDto = req.body;
    const result = await this.engineService.handleEntryStep(dto);

    return res.status(200).json(result);
  }

  /**
   * POST /api/undo-step
   *
   * Undo the last step in the session history.
   */
  @POST("/api/undo-step")
  @UseDTO(UndoStepDto)
  async undoStep(req: Request, res: Response) {
    const dto: UndoStepDto = req.body;
    const result = await this.engineService.handleUndoStep(dto);

    return res.status(200).json(result);
  }

  /**
   * POST /api/hint-request
   *
   * Request a hint for the current expression.
   */
  @POST("/api/hint-request")
  @UseDTO(HintRequestDto)
  async hintRequest(req: Request, res: Response) {
    const dto: HintRequestDto = req.body;
    const result = await this.engineService.handleHintRequest(dto);

    return res.status(200).json(result);
  }
}
