/**
 * Dependency Injection Registry
 *
 * Registers all dependencies with tsyringe container.
 */

import { container } from "tsyringe";
import { JsonFileStorage } from "./modules/storage/JsonFileStorage.js";
import {
  COURSES_DIR,
  DATA_DIR,
  HTTP_SERVER_ENABLE_CORS,
  HTTP_SERVER_ENABLE_LOGGING,
  HTTP_SERVER_LOG,
  HTTP_SERVER_PORT,
  HTTP_SERVER_ROUTERS,
  INVARIANT_LOADER_BASE_PATH,
  JWT_SECRET,
  JWT_SECRET_EXPIRY,
  STORAGE_SERVICE,
} from "./tokens.js";

// Re-export tokens for backward compatibility
export * from "./tokens.js";

export const resolveDependencies = () => {
  // Storage (register first since other services depend on it)
  container.register(DATA_DIR, {
    useValue: "data",
  });
  container.register(STORAGE_SERVICE, {
    useClass: JsonFileStorage,
  });

  // Courses
  container.register(COURSES_DIR, {
    useValue: "config/courses",
  });

  // Auth
  container.register(JWT_SECRET, {
    useValue: process.env.JWT_SECRET || "",
  });
  container.register(JWT_SECRET_EXPIRY, {
    useValue: process.env.JWT_SECRET_EXPIRY || "1h",
  });

  // InvariantLoader
  container.register(INVARIANT_LOADER_BASE_PATH, {
    useValue: process.cwd(),
  });

  // HttpServer
  container.register(HTTP_SERVER_PORT, {
    useValue: Number(process.env.HTTP_SERVER_PORT) || 4201,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor = new (...args: any[]) => object;

export const registerRouters = (routers: Constructor[]) => {
  const resolvedRouter = routers.map((router) => container.resolve(router));
  container.register(HTTP_SERVER_ROUTERS, {
    useValue: resolvedRouter,
  });
};
