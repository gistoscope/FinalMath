/**
 * Entry Step DTO
 *
 * Request validation for the entry-step endpoint.
 */
import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class EntryStepDto {
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
