import { RequestHandler } from "express";
import { CONTROLLER_MIDDLEWARE_KEY, MIDDLEWARE_KEY } from "./decorators.key";

export function Use(middleware: RequestHandler | RequestHandler[]) {
  return function (target: any, propertyKey?: string | symbol) {
    const middlewares = Array.isArray(middleware) ? middleware : [middleware];
    if (propertyKey && typeof propertyKey === "string") {
      // methods level middleware logic
      const existedMiddlewares: RequestHandler[] =
        Reflect.getMetadata(MIDDLEWARE_KEY, target, propertyKey) || [];
      const combinedMiddlewares = [...existedMiddlewares, ...middlewares];
      Reflect.defineMetadata(
        MIDDLEWARE_KEY,
        combinedMiddlewares,
        target,
        propertyKey
      );
      return;
    }
    // class level middleware
    const existedMiddlewares: RequestHandler[] =
      Reflect.getMetadata(CONTROLLER_MIDDLEWARE_KEY, target) || [];
    const combinedMiddlewares = [...existedMiddlewares, ...middlewares];
    Reflect.defineMetadata(
      CONTROLLER_MIDDLEWARE_KEY,
      combinedMiddlewares,
      target
    );
  };
}
