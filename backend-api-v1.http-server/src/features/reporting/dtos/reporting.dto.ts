/**
 * Reporting DTOs
 *
 * Request validation for reporting endpoints.
 */
import { IsNotEmpty, IsString } from "class-validator";

/**
 * Student Progress Query DTO
 * Note: For query params, we validate in the controller
 */
export class StudentProgressQueryDto {
  @IsNotEmpty({ message: "Field 'userId' is required." })
  @IsString()
  userId!: string;
}
