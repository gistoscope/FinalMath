import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class OrchestratorStepV5Dto {
  @IsNotEmpty({ message: "Field 'expressionLatex' is required." })
  @IsString()
  expressionLatex!: string;

  @IsNotEmpty({ message: "Field 'sessionId' is required." })
  @IsString()
  sessionId!: string;

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
  preferredPrimitiveId?: string;

  @IsOptional()
  @IsString()
  policyId?: string;

  // --- New V5 specific fields ---

  @IsOptional()
  @IsString()
  surfaceNodeKind?: string;

  @IsOptional()
  @IsString()
  clickTargetKind?: string;

  @IsOptional()
  @IsString()
  operator?: string;

  @IsOptional()
  @IsString()
  surfaceNodeId?: string;
}
