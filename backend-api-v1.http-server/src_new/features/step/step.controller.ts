import { Request, Response } from "express";
import { autoInjectable } from "tsyringe";
import { Controller } from "../../core/decorator/controller.decorator";
import { UseDTO } from "../../core/decorator/dto.decorator";
import { POST } from "../../core/decorator/routes.decorator";
import { StepEntryDto } from "./dtos/sign-in.dto";
import { StepService } from "./step.service";

@autoInjectable()
@Controller("/api/v1/step")
export class StepController {
  constructor(private readonly stepService: StepService) {}

  @POST("/entry")
  @UseDTO(StepEntryDto)
  async entry(req: Request, res: Response) {
    // const {  }: StepEntryDto = req.body;
    const username = "";
    const password = "";

    const token = await this.stepService.signIn(req.body);

    return res.status(200).json({
      message: "Login was successful",
      data: { token },
    });
  }

  @POST("/undo")
  async undo(req: Request, res: Response) {
    await this.stepService.signUp(req.body);

    return res.status(200).json({
      isSuccess: true,
      message: "Registration Successful",
      data: null,
    });
  }
}
