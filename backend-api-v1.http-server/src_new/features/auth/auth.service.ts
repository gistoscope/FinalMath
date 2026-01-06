import { injectable } from "tsyringe";
import { NotFoundException, ValidationException } from "../../core/errors";
import { CreateUserDto } from "../user/dtos/create-user.dto";
import { User, UserService } from "../user/user.service";
import { Token } from "./token.helpers";
export type UserRole = "student" | "teacher";

@injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly token: Token
  ) {}

  async signIn(username: string, password: string) {
    const user = await this.userService.getUserByUsername(username);
    const errorMessages = [
      { property: "username", constraints: ["Invalid username!"] },
      { property: "password", constraints: ["Invalid password!"] },
    ];
    if (!user || user.password !== password) {
      throw new ValidationException(errorMessages);
    }

    return this.token.generate({
      id: user.id,
      username: user.username,
      role: user.role,
    });
  }

  async signUp(data: CreateUserDto) {
    const { username, password } = data;
    const findUser = await this.userService.getUserByUsername(username);
    if (findUser) {
      throw new Error("Username already exists");
    }
    const user: User = await this.userService.createUser(data);
    return user;
  }

  async me(userId: string) {
    const userData = await this.userService.getUserById(userId);
    if (!userData) throw new NotFoundException("User not found");
    return userData;
  }
}
