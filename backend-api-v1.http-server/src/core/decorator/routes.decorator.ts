import { RequestHandler } from "express";
import { ROUTE_KEY } from "./decorators.key";

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

export type RouteDefinition = {
  method: HttpMethod;
  path: string;
  middlewares: RequestHandler[];
  methodName: string;
};

const Route = (
  method: HttpMethod,
  path: string,
  middlewares: RequestHandler[]
) => {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const routes: RouteDefinition[] =
      Reflect.getMetadata(ROUTE_KEY, target) || [];

    routes.push({
      method,
      path,
      middlewares,
      methodName: propertyKey.toString(),
    });

    Reflect.defineMetadata(ROUTE_KEY, routes, target);

    return descriptor;
  };
};

export const GET = (path: string, middlewares: RequestHandler[] = []) =>
  Route("get", path, middlewares);
export const POST = (path: string, middlewares: RequestHandler[] = []) =>
  Route("post", path, middlewares);
export const PUT = (path: string, middlewares: RequestHandler[] = []) =>
  Route("put", path, middlewares);
export const PATCH = (path: string, middlewares: RequestHandler[] = []) =>
  Route("patch", path, middlewares);
export const DELETE = (path: string, middlewares: RequestHandler[] = []) =>
  Route("delete", path, middlewares);
