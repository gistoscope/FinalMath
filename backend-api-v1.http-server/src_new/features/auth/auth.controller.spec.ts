/**
 * Auth Controller Tests
 */

import { Request, Response } from "express";
import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundException, ValidationException } from "../../core/errors";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController", () => {
  let controller: AuthController;
  let mockAuthService: Partial<AuthService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    // Create mock AuthService
    mockAuthService = {
      signIn: vi.fn(),
      signUp: vi.fn(),
      me: vi.fn(),
    };

    // Manually create controller with mock service
    controller = new AuthController(mockAuthService as AuthService);

    mockReq = { body: {}, user: undefined };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe("signIn", () => {
    it("should handle sign in request and return token", async () => {
      (mockAuthService.signIn as any).mockResolvedValue("test-token");

      mockReq.body = {
        username: "testuser",
        password: "password",
      };

      await controller.signIn(mockReq as Request, mockRes as Response);

      expect(mockAuthService.signIn).toHaveBeenCalledWith(
        "testuser",
        "password"
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    // Note: The controller doesn't try/catch signIn explicitly in the code I saw,
    // so it might bubble up. But generally controllers rely on global error handler or try/catch.
    // The previous test suite assumed checking for rejected value bubbling up or handled.
    // The actual controller code doesn't have try/catch block around signIn!
    // So this test should expect it to reject if we want to test that.
    it("should throw if service throws", async () => {
      (mockAuthService.signIn as any).mockRejectedValue(
        new ValidationException([
          { property: "password", constraints: ["Invalid password"] },
        ])
      );

      mockReq.body = { username: "testuser", password: "wrong" };

      await expect(
        controller.signIn(mockReq as Request, mockRes as Response)
      ).rejects.toThrow();
    });
  });

  describe("signUp", () => {
    it("should handle sign up request", async () => {
      (mockAuthService.signUp as any).mockResolvedValue({
        id: "new-user",
        username: "newuser",
        email: "new@example.com",
      });

      mockReq.body = {
        username: "newuser",
        email: "new@example.com",
        password: "password123",
      };

      await controller.signUp(mockReq as Request, mockRes as Response);

      expect(mockAuthService.signUp).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200); // 200 in current implementation
    });
  });

  describe("me", () => {
    // Controller method assumes user is present due to middleware.
    // So we only test valid case and handling of service errors.

    it("should return user data when user exists", async () => {
      mockReq.user = { id: "demo-user" };
      (mockAuthService.me as any).mockResolvedValue({
        id: "demo-user",
        username: "demo",
      });

      await controller.me(mockReq as Request, mockRes as Response);

      expect(mockAuthService.me).toHaveBeenCalledWith("demo-user");
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should throw NotFoundException if service throws", async () => {
      mockReq.user = { id: "non-existent" };
      (mockAuthService.me as any).mockRejectedValue(new NotFoundException());

      await expect(
        controller.me(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(NotFoundException);
    });
  });
});
