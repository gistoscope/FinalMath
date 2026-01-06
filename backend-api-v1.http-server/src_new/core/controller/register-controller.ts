import {
  Express,
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from "express";
import { container } from "tsyringe";
import {
  CONTROLLER_KEY,
  CONTROLLER_MIDDLEWARE_KEY,
  DTO_KEY,
  MIDDLEWARE_KEY,
  ROUTE_KEY,
} from "../decorator/decorators.key";
import { RouteDefinition } from "../decorator/routes.decorator";
import { validateDtoHandler } from "../validator/class-schema.validator";
export type Constructor = new (...args: any[]) => {};
export type ControllerMetaData = {
  basePath: string;
  routes: RouteDefinition[];
  middlewares: RequestHandler[];
};
export function registerController(app: Express, controllers: Constructor[]) {
  controllers.forEach((Controller) => {
    const controllerInstance = container.resolve(Controller);

    const controllerMetadata: ControllerMetaData = {
      basePath: Reflect.getMetadata(CONTROLLER_KEY, Controller),
      routes:
        (Reflect.getMetadata(
          ROUTE_KEY,
          Controller.prototype
        ) as RouteDefinition[]) || [],
      middlewares:
        (Reflect.getMetadata(
          CONTROLLER_MIDDLEWARE_KEY,
          Controller
        ) as RequestHandler[]) || [],
    };

    if (!controllerMetadata.basePath) {
      throw new Error(
        `[registerController]: basepath is not defined for controller ${Controller.name}`
      );
    }
    if (!controllerMetadata.routes.length) {
      throw new Error(
        `[registerController]: no routes is being defined for controller ${Controller.name}`
      );
    }

    const router: Router = Router();

    if (controllerMetadata.middlewares.length > 0) {
      router.use(controllerMetadata.middlewares);
      console.log(
        `[registerController]: middleware applied for controller ${Controller.name}`
      );
    }

    controllerMetadata.routes.forEach((route) => {
      if (!(route.methodName in controllerInstance)) {
        throw new Error(
          `[registerController]: method ${route.methodName} is not defined for ${Controller.name}`
        );
      }
      const middlewares =
        (Reflect.getMetadata(
          MIDDLEWARE_KEY,
          Controller.prototype,
          route.methodName
        ) as RequestHandler[]) || [];

      const dto = Reflect.getMetadata(
        DTO_KEY,
        Controller.prototype,
        route.methodName
      );

      const handler = (controllerInstance as any)[route.methodName].bind(
        controllerInstance
      );

      const handleWithError = async (
        req: Request,
        res: Response,
        next: NextFunction
      ) => {
        try {
          return await handler(req, res);
        } catch (error) {
          return next(error);
        }
      };

      const dtoHandler = dto ? [validateDtoHandler(dto)] : [];
      router[route.method](route.path, [
        ...middlewares,
        ...dtoHandler,
        handleWithError,
      ]);
    });

    app.use(controllerMetadata.basePath, router);
  });
}
