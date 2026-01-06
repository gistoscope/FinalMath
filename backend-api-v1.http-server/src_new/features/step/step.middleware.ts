import { ExtractJwt, Strategy, StrategyOptions } from "passport-jwt";

import { NextFunction, Request, Response } from "express";
import passport, { PassportStatic } from "passport";
import { injectable } from "tsyringe";
import { UnauthorizedException } from "../core/errors";
import { UserService } from "../user/user.service";

@injectable()
export class AuthMiddleware {
  constructor(private readonly userService: UserService) {}

  init(passport: PassportStatic) {
    const opts: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    };

    passport.use(
      new Strategy(opts, async (payload, done) => {
        try {
          const user: any = await this.userService.findOne({
            id: payload.id,
          });
          if (!user) return done(null, false);
          return done(null, user);
        } catch (error) {
          console.log(error, "1rs");
          return done(error);
        }
      })
    );
  }

  static authenticate(req: Request, res: Response, next: NextFunction) {
    console.log("authenticate method");
    passport.authenticate("jwt", (err: any, user: any, info: any) => {
      if (err) {
        console.log(err); // todo remove later
        console.log(info); // todo remove later
        return next(err);
      }
      if (!user) throw new UnauthorizedException();
      req.user = user;
      return next();
    })(req, res, next);
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
      const role = (req as any).user?.role.role;
      if (role === "admin" || role === "super_admin") {
        return next();
      }
      throw new UnauthorizedException();
    } catch (error) {
      next(error);
    }
  }
  static async isSuperAdmin(
    req: Request<any>,
    res: Response,
    next: NextFunction
  ) {
    try {
      if ((req as any).user?.role.role === "super_admin") return next();
      throw new UnauthorizedException();
    } catch (error) {
      next(error);
    }
  }
}
