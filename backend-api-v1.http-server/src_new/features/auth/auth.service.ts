import { injectable } from "tsyringe";

import {
  HttpException,
  NotFoundException,
  ValidationException,
} from "../../core/errors";
import { CreateUserDto } from "../user/dtos/create-user.dto";
import { UserService } from "../user/user.service";
import { PasswordHash } from "./helpers/password-hash.helper";
import { Token } from "./token.helpers";

@injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,

    private readonly hash: PasswordHash,
    private readonly token: Token
  ) {}

  async signIn(username: string, password: string) {
    const findUser = await this.userService.findOne({
      OR: [{ username }, { email: username }],
    });

    const errorMessages = [
      { property: "username", constraints: ["Invalid username!"] },
      { property: "password", constraints: ["Invalid password!"] },
    ];

    if (!findUser) throw new ValidationException(errorMessages);

    const isPasswordOk = this.hash.verify(password, findUser.password);

    if (!isPasswordOk) throw new ValidationException(errorMessages);
    if (!findUser.isVerified)
      throw new HttpException(
        "You account is not yet activated! We will let you know when it activated!",
        406
      );

    return this.token.generate(findUser);
  }

  async signUp(data: CreateUserDto) {
    return this.userService.createUser(data);
  }

  async me(userId: string) {
    const userData = await this.userService.findOne({ id: userId });
    if (!userData) throw new NotFoundException();
    return userData;
  }
}
