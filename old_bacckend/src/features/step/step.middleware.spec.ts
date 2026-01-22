/**
 * Step Middleware Tests
 */

import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserService } from "../user/user.service";
import { AuthMiddleware } from "./step.middleware";

describe("StepMiddleware", () => {
  let middleware: AuthMiddleware;
  let mockUserService: Partial<UserService>;

  beforeEach(() => {
    mockUserService = {
      findOne: vi.fn(),
    };
    middleware = new AuthMiddleware(mockUserService as UserService);
  });

  describe("init", () => {
    it("should initialize passport", () => {
      const mockPassport = { use: vi.fn() };
      expect(() => middleware.init(mockPassport as any)).not.toThrow();
      expect(mockPassport.use).toHaveBeenCalled();
    });
  });

  describe("static checks", () => {
    it("should have authenticate method", () => {
      expect(typeof AuthMiddleware.authenticate).toBe("function");
    });
  });
});
