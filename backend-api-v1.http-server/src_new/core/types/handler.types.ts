/**
 * Shared Handler Types
 *
 * Types and tokens for dependency injection of handler dependencies.
 */

import type { Logger } from "pino";

import {
  type EngineStepResponse,
  type InMemoryInvariantRegistry,
  type PrimitiveMaster,
  type StepPolicyConfig,
  type UserRole,
} from "../stubs";

/**
 * Common dependencies for all handlers.
 * These are injected via the DI container.
 */
export interface HandlerDeps {
  invariantRegistry: InMemoryInvariantRegistry;
  policy: StepPolicyConfig;
  log?: (message: string) => void;
  logger?: Logger;
  primitiveMaster?: PrimitiveMaster;
}

/**
 * Token for dependency injection.
 */
export const HANDLER_DEPS_TOKEN = Symbol.for("HANDLER_DEPS");

export type {
  EngineStepResponse,
  InMemoryInvariantRegistry,
  PrimitiveMaster,
  StepPolicyConfig,
  UserRole,
};
