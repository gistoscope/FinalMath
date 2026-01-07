/**
 * Registry Tests
 */

import "reflect-metadata";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HANDLER_DEPS_TOKEN, type HandlerDeps } from "./core/types";
import { resolveDependencies } from "./registry";

describe("Registry", () => {
  beforeEach(() => {
    container.clearInstances();
  });

  describe("resolveDependencies", () => {
    it("should register handler deps in container", () => {
      // Mock pino to avoid actual logging
      vi.mock("pino", () => ({
        default: () => ({
          info: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
          level: "info",
        }),
      }));

      expect(() => resolveDependencies()).not.toThrow();
    });

    it("should make HANDLER_DEPS_TOKEN resolvable", () => {
      resolveDependencies();

      const deps = container.resolve<HandlerDeps>(HANDLER_DEPS_TOKEN);
      expect(deps).toBeDefined();
      expect(deps.invariantRegistry).toBeDefined();
      expect(deps.policy).toBeDefined();
    });
  });
});
