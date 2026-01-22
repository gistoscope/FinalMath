import { IsNotEmpty, IsString } from "class-validator";

export class StepUndoDto {
  @IsNotEmpty({ message: "Field 'sessionId' is required." })
  @IsString()
  sessionId!: string;
}
