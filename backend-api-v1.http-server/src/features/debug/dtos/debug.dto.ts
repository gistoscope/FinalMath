/**
 * Debug DTOs
 *
 * Request validation for debug endpoints.
 */
import { Type } from "class-transformer";
import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

/**
 * Selection object for debug requests
 */
export class SelectionDto {
  @IsOptional()
  @IsString()
  selectionPath?: string;

  @IsOptional()
  @IsNumber()
  operatorIndex?: number;
}

/**
 * AST Debug DTO
 */
export class AstDebugDto {
  @IsNotEmpty({ message: "Field 'latex' is required." })
  @IsString()
  latex!: string;
}

/**
 * MapMaster Debug DTO
 */
export class MapMasterDebugDto {
  @IsNotEmpty({ message: "Field 'latex' is required." })
  @IsString()
  latex!: string;

  @IsNotEmpty({ message: "Field 'selection' is required." })
  @ValidateNested()
  @Type(() => SelectionDto)
  selection!: SelectionDto;
}

/**
 * MapMaster Global Map DTO
 */
export class MapMasterGlobalMapDto {
  @IsNotEmpty({ message: "Field 'latex' is required." })
  @IsString()
  latex!: string;
}

/**
 * Step Debug DTO
 */
export class StepDebugDto {
  @IsNotEmpty({ message: "Field 'latex' is required." })
  @IsString()
  latex!: string;

  @IsNotEmpty({ message: "Field 'selection' is required." })
  @ValidateNested()
  @Type(() => SelectionDto)
  selection!: SelectionDto;

  @IsOptional()
  @IsObject()
  session?: any;
}

/**
 * Primitive Map Debug DTO
 */
export class PrimitiveMapDebugDto {
  @IsNotEmpty({ message: "Field 'latex' is required." })
  @IsString()
  latex!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SelectionDto)
  selection?: SelectionDto;
}

/**
 * Instrument DTO
 */
export class InstrumentDto {
  @IsNotEmpty({ message: "Field 'latex' is required." })
  @IsString()
  latex!: string;
}

/**
 * AST Resolve Path DTO
 */
export class AstResolvePathDto {
  @IsNotEmpty({ message: "Field 'latex' is required." })
  @IsString()
  latex!: string;

  @IsNotEmpty({ message: "Field 'selectionPath' is required." })
  @IsString()
  selectionPath!: string;
}

/**
 * Validate Operator DTO
 */
export class ValidateOperatorDto {
  @IsNotEmpty({ message: "Field 'latex' is required." })
  @IsString()
  latex!: string;

  @IsOptional()
  @IsString()
  operatorPath?: string;
}
