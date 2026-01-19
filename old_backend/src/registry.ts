import { container } from "tsyringe";

export const DATA_DIR = Symbol("DATA_DIR");
export const COURSES_DIR = Symbol("COURSES_DIR");
export const JWT_SECRET = Symbol("JWT_SECRET");
export const JWT_SECRET_EXPIRY = Symbol("JWT_SECRET_EXPIRY");
// InvariantLoader
export const INVARIANT_LOADER_BASE_PATH = Symbol("INVARIANT_LOADER_BASE_PATH");

// HttpServer
export const HTTP_SERVER_PORT = Symbol("HTTP_SERVER_PORT");
export const HTTP_SERVER_ROUTERS = Symbol("HTTP_SERVER_ROUTERS");
export const HTTP_SERVER_LOG = Symbol("HTTP_SERVER_LOG");
export const HTTP_SERVER_ENABLE_CORS = Symbol("HTTP_SERVER_ENABLE_CORS");
export const HTTP_SERVER_ENABLE_LOGGING = Symbol("HTTP_SERVER_ENABLE_LOGGING");

export const resolveDependencies = () => {
  container.register(DATA_DIR, {
    useValue: "data",
  });
  container.register(COURSES_DIR, {
    useValue: "config/courses",
  });
  container.register(JWT_SECRET, {
    useValue: process.env.JWT_SECRET || "",
  });
  container.register(JWT_SECRET_EXPIRY, {
    useValue: process.env.JWT_SECRET_EXPIRY || "1h",
  });
  container.register(INVARIANT_LOADER_BASE_PATH, {
    useValue: process.cwd(),
  });

  // HttpServer
  container.register(HTTP_SERVER_PORT, {
    useValue: process.env.HTTP_SERVER_PORT || 4201,
  });
  container.register(HTTP_SERVER_ROUTERS, {
    useValue: [],
  });
  container.register(HTTP_SERVER_LOG, {
    useValue: console.log,
  });
  container.register(HTTP_SERVER_ENABLE_CORS, {
    useValue: true,
  });
  container.register(HTTP_SERVER_ENABLE_LOGGING, {
    useValue: true,
  });
};

export type Constructor = new (...args: any[]) => {};

export const registerRouters = (routers: Constructor[]) => {
  const resolvedRouter = routers.map((router) => container.resolve(router));
  container.register(HTTP_SERVER_ROUTERS, {
    useValue: resolvedRouter,
  });
};
