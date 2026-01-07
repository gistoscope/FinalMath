import { Request, Response } from "express";
import { autoInjectable } from "tsyringe";
import { Controller } from "../../core/decorator/controller.decorator";
import { UseDTO } from "../../core/decorator/dto.decorator";
import { POST } from "../../core/decorator/routes.decorator";
import { StepEntryDto, StepUndoDto } from "./dtos";
import { StepService } from "./step.service";

@autoInjectable()
@Controller("/api/v1/step")
export class StepController {
  constructor(private readonly stepService: StepService) {}

  @POST("/entry")
  @UseDTO(StepEntryDto)
  async entry(req: Request, res: Response) {
    const dto: StepEntryDto = req.body;
    const result = await this.stepService.handleEntry(dto);
    return res.status(200).json(result);
  }

  @POST("/undo")
  @UseDTO(StepUndoDto)
  async undo(req: Request, res: Response) {
    const dto: StepUndoDto = req.body;
    const result = await this.stepService.handleUndo(dto);
    return res.status(200).json(result);
  }
}
