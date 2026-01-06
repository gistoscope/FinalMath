/**
 * Step Entry DTO
 *
 * Request validation for the step endpoints.
 * Note: This is kept for backward compatibility but the EngineController
 * with EntryStepDto should be used for new implementations.
 */
import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class StepEntryDto {
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

  @IsOptional()
  @IsString()
  policyId?: string;

  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsString()
  preferredPrimitiveId?: string;
}

export class UndoStepDto {
  @IsNotEmpty({ message: "Field 'sessionId' is required." })
  @IsString()
  sessionId!: string;
}
