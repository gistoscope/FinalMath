/**
 * User DTOs
 *
 * Request validation for user-related operations.
 */
import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateUserDto {
  @IsNotEmpty({ message: "Username is required" })
  @IsString()
  username!: string;

  @IsNotEmpty({ message: "Email is required" })
  @IsEmail({}, { message: "Invalid email format" })
  email!: string;

  @IsNotEmpty({ message: "Password is required" })
  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  role?: string;
}
