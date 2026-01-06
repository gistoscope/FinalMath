import { IsNotEmpty, IsString } from "class-validator";

export class SignInDto {
  @IsNotEmpty({ message: "Username is required!" })
  @IsString()
  username!: string;

  @IsNotEmpty({ message: "Password is required!" })
  @IsString()
  password!: string;
}
