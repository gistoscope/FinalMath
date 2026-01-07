import { JwtPayload } from "jsonwebtoken";
import {
  ExtractJwt,
  Strategy,
  StrategyOptionsWithoutRequest,
  VerifiedCallback,
} from "passport-jwt";

import { NextFunction, Request, Response } from "express";
import passport, { PassportStatic } from "passport";
import { injectable } from "tsyringe";
import { UnauthorizedException } from "../../core/errors";
import { UserService } from "../user/user.service";

@injectable()
export class AuthMiddleware {
  constructor(private readonly userService: UserService) {}

  init(passportInstance: PassportStatic) {
    const opts: StrategyOptionsWithoutRequest = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:
        process.env.JWT_SECRET ||
        process.env.SECRET_KEY ||
        "default_insecure_secret",
    };

    passportInstance.use(
      new Strategy(
        opts,
        async (payload: JwtPayload, done: VerifiedCallback) => {
          try {
            const userId = (payload.id || payload.userId) as string;
            const user = await this.userService.findOne({
              id: userId,
            });
            if (!user) return done(null, false);
            return done(null, user);
          } catch (error) {
            console.log(error, "auth error");
            return done(error as Error);
          }
        }
      )
    );
  }

  static authenticate(req: Request, res: Response, next: NextFunction) {
    console.log("authenticate method");
    passport.authenticate(
      "jwt",
      (err: Error | null, user: unknown, info: unknown) => {
        if (err) {
          console.log(err);
          console.log(info);
          return next(err);
        }
        if (!user) throw new UnauthorizedException();
        req.user = user;
        return next();
      }
    )(req, res, next);
  }

  static isAuthenticate(req: Request, res: Response, next: NextFunction) {
    try {
      this.authenticate(req, res, next);
    } catch (error) {
      return next();
    }
  }

  static async isAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const role = (req as any).user?.role?.role;
      if (role === "admin" || role === "super_admin") {
        return next();
      }
      throw new UnauthorizedException();
    } catch (error) {
      next(error);
    }
  }

  static async isSuperAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      if ((req as any).user?.role?.role === "super_admin") return next();
      throw new UnauthorizedException();
    } catch (error) {
      next(error);
    }
  }
}
