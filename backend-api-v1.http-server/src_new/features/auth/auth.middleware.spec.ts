/**
 * Auth Middleware Tests
 */

import { Response } from "express";
import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnauthorizedException } from "../../core/errors";
import { UserService } from "../user/user.service";
import { AuthMiddleware } from "./auth.middleware";

describe("AuthMiddleware", () => {
  let authMiddleware: AuthMiddleware;
  let mockUserService: Partial<UserService>;

  beforeEach(() => {
    mockUserService = {
      findOne: vi.fn(),
    };

    // Manual instantiation to avoid DI metadata issues in tests
    authMiddleware = new AuthMiddleware(mockUserService as UserService);
  });

  describe("init", () => {
    it("should initialize passport with JWT strategy", () => {
      const mockPassport = {
        use: vi.fn(),
      };

      expect(() => authMiddleware.init(mockPassport as any)).not.toThrow();
      expect(mockPassport.use).toHaveBeenCalled();
    });
  });

  describe("authenticate (static)", () => {
    it("should be a function", () => {
      expect(typeof AuthMiddleware.authenticate).toBe("function");
    });
  });

  describe("isAuthenticate (static)", () => {
    it("should be a function", () => {
      expect(typeof AuthMiddleware.isAuthenticate).toBe("function");
    });
  });

  describe("isAdmin (static)", () => {
    const mockRes = {} as Response;
    const mockNext = vi.fn();

    it("should call next with error for non-admin user", async () => {
      const mockReq = { user: { role: { role: "student" } } } as any;

      await AuthMiddleware.isAdmin(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedException));
    });

    it("should call next without error for admin user", async () => {
      const mockReq = { user: { role: { role: "admin" } } } as any;

      await AuthMiddleware.isAdmin(mockReq, mockRes, mockNext);

      // Call signature for success is usually next() vs failure next(err)
      expect(mockNext).toHaveBeenCalled();
      // Ensure it wasn't called with an error
      const lastCallArgs = mockNext.mock.calls[mockNext.mock.calls.length - 1];
      expect(lastCallArgs[0]).toBeUndefined();
    });
  });

  describe("isSuperAdmin (static)", () => {
    const mockRes = {} as Response;
    const mockNext = vi.fn();

    it("should call next with error for non-super-admin user", async () => {
      const mockReq = { user: { role: { role: "admin" } } } as any;

      await AuthMiddleware.isSuperAdmin(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedException));
    });

    it("should call next without error for super_admin user", async () => {
      const mockReq = { user: { role: { role: "super_admin" } } } as any;

      await AuthMiddleware.isSuperAdmin(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const lastCallArgs = mockNext.mock.calls[mockNext.mock.calls.length - 1];
      expect(lastCallArgs[0]).toBeUndefined();
    });
  });
});
