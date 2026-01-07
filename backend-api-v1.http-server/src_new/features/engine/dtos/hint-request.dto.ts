/**
 * Hint Request DTO
 *
 * Request validation for the hint-request endpoint.
 */
import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class HintRequestDto {
  @IsNotEmpty({ message: "Field 'expressionLatex' is required." })
  @IsString()
  expressionLatex!: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  selectionPath?: string;

  @IsOptional()
  @IsNumber()
  operatorIndex?: number;
}
