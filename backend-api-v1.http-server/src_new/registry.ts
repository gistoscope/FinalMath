/**
 * Dependency Registration
 *
 * Registers all dependencies for the application.
 */

import "reflect-metadata";
import { container } from "tsyringe";
import { HANDLER_DEPS_TOKEN, type HandlerDeps } from "./core/types";

// Import stubs
import {
  createDefaultStudentPolicy,
  createStubInvariantRegistry,
} from "./core/stubs";

// Import pino for logging
import pino from "pino";

/**
 * Register all dependencies with the DI container.
 * This function should be called once at application startup.
 */
export function resolveDependencies() {
  const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    transport:
      process.env.NODE_ENV !== "production"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  });

  const invariantRegistry = createStubInvariantRegistry();
  const policy = createDefaultStudentPolicy();

  const handlerDeps: HandlerDeps = {
    invariantRegistry,
    policy,
    logger,
    log: (msg: string) => logger.info(msg),
  };

  // Register HandlerDeps as a singleton
  container.register(HANDLER_DEPS_TOKEN, {
    useValue: handlerDeps,
  });

  logger.info("[Registry] Dependencies registered successfully (using stubs)");
}
