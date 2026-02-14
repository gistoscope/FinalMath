import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export enum UserRole {
  STUDENT = "student",
  TEACHER = "teacher",
}

export class OrchestratorEntryDTO {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @IsString()
  @IsNotEmpty()
  expressionLatex!: string;

  @IsOptional()
  @IsString()
  selectionPath?: string;

  @IsOptional()
  @IsNumber()
  operatorIndex?: number;

  @IsOptional()
  @IsString()
  @IsEnum(UserRole)
  userRole: UserRole = UserRole.STUDENT;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  preferredPrimitiveId?: string;

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
