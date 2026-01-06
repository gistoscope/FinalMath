import { Request, Response } from "express";
import { autoInjectable } from "tsyringe";
import { Controller } from "../../core/decorator/controller.decorator";
import { UseDTO } from "../../core/decorator/dto.decorator";
import { Use } from "../../core/decorator/middleware.decorator";
import { POST } from "../../core/decorator/routes.decorator";
import { AuthMiddleware } from "./auth.middleware";
import { AuthService } from "./auth.service";
import { SignInDto } from "./dtos/sign-in.dto";

@autoInjectable()
@Controller("/api/v1/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @POST("/sign-in")
  @UseDTO(SignInDto)
  async signIn(req: Request, res: Response) {
    const { username, password }: SignInDto = req.body;

    const token = await this.authService.signIn(username, password);

    return res.status(200).json({
      message: "Login was successful",
      data: { token },
    });
  }

  @POST("/sign-up")
  // @UseDTO(CreateUserDto)
  async signUp(req: Request, res: Response) {
    await this.authService.signUp(req.body);

    return res.status(200).json({
      isSuccess: true,
      message: "Registration Successful",
      data: null,
    });
  }

  @POST("/me")
  @Use(AuthMiddleware.authenticate)
  async me(req: Request, res: Response) {
    const user: any = req.user;

    const userData = await this.authService.me(user.id);

    return res.status(200).json({
      message: "User found!",
      data: userData,
    });
  }
}
