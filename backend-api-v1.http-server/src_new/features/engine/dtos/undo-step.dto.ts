/**
 * Undo Step DTO
 *
 * Request validation for the undo-step endpoint.
 */
import { IsNotEmpty, IsString } from "class-validator";

export class UndoStepDto {
  @IsNotEmpty({ message: "Field 'sessionId' is required." })
  @IsString()
  sessionId!: string;
}
