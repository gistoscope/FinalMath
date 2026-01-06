import { IsEmail, IsNotEmpty, Length } from "class-validator";
// import { Match } from '../decorators/match.decorator';

export class SignUpDto {
  @IsNotEmpty({ message: "First Name is required!" })
  @Length(1, 50, { message: "First name must be less than 50 chars!" })
  firstName!: string;

  @IsNotEmpty({ message: "Last Name is required!" })
  @Length(1, 50, { message: "Last name must be less than 50 chars!" })
  lastName!: string;

  @IsEmail({}, { message: "Email must be valid!" })
  @IsNotEmpty({ message: "Email is required!" })
  email!: string;

  @Length(8, 32, { message: "Password must be between 8 to 32 chars" })
  password!: string;

  // @Match('password', { message: "Password didn't match!" })
  confirmPassword!: string;
}
