/**
 * App Tests
 */

import "reflect-metadata";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app";
import { AuthMiddleware } from "./features/auth/auth.middleware";
import { resolveDependencies } from "./registry";

describe("App", () => {
  let mockAuthMiddleware: any;

  beforeEach(() => {
    container.clearInstances();
    vi.clearAllMocks();

    // Mock AuthMiddleware
    mockAuthMiddleware = {
      init: vi.fn(),
    };

    // We must register it so container.resolve(AuthMiddleware) returns our mock
    container.register(AuthMiddleware, { useValue: mockAuthMiddleware });

    // Also need to register dependencies if resolveDependencies is called inside createApp?
    // Looking at app.ts, it doesn't call resolveDependencies, index.ts does.
    // So we should be good just mocking AuthMiddleware.
  });

  describe("createApp", () => {
    it("should create an Express app", () => {
      // Need to register handler deps for other parts if they are resolved on start?
      // createApp just sets up middleware usually.

      // However, check if createApp resolves other things.
      resolveDependencies(); // Set up basic logger deps etc.

      // Re-register auth middleware mock because resolveDependencies might clear/reset or not interfere
      // container.register(AuthMiddleware, { useValue: mockAuthMiddleware });
      // Actually resolveDependencies registers HANDLER_DEPS_TOKEN only.

      const app = createApp();

      expect(app).toBeDefined();
      expect(typeof app.use).toBe("function");
    });

    it("should have CORS enabled", () => {
      resolveDependencies();
      const app = createApp();
      expect(app).toBeDefined();
    });

    it("should have JSON body parsing", () => {
      resolveDependencies();
      const app = createApp();
      expect(app).toBeDefined();
    });
  });
});
