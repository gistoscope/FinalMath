/**
 * Auth Service Tests
 */

import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundException, ValidationException } from "../../core/errors";
import { UserService } from "../user/user.service";
import { AuthService } from "./auth.service";
import { PasswordHash } from "./helpers/password-hash.helper";
import { Token } from "./token.helpers";

describe("AuthService", () => {
  let authService: AuthService;
  let mockUserService: Partial<UserService>;
  let mockPasswordHash: Partial<PasswordHash>;
  let mockToken: Partial<Token>;

  beforeEach(() => {
    mockUserService = {
      findOne: vi.fn(),
      createUser: vi.fn(),
    };

    mockPasswordHash = {
      hash: vi.fn().mockReturnValue("hashed-password"),
      verify: vi.fn().mockReturnValue(false),
      otpHash: vi.fn().mockReturnValue("otp-hash"),
    };

    mockToken = {
      generate: vi.fn().mockReturnValue("mock-token"),
    };

    authService = new AuthService(
      mockUserService as UserService,
      mockPasswordHash as PasswordHash,
      mockToken as Token
    );
  });

  describe("signIn", () => {
    it("should throw ValidationException for non-existent user", async () => {
      (mockUserService.findOne as any).mockResolvedValue(null);

      await expect(
        authService.signIn("nonexistent", "password")
      ).rejects.toThrow(ValidationException);
    });

    it("should throw ValidationException for wrong password", async () => {
      (mockUserService.findOne as any).mockResolvedValue({
        id: "user-1",
        username: "demo",
        password: "hashed",
      });
      (mockPasswordHash.verify as any).mockReturnValue(false);

      await expect(authService.signIn("demo", "wrongpassword")).rejects.toThrow(
        ValidationException
      );
    });

    it("should return token for valid credentials", async () => {
      (mockUserService.findOne as any).mockResolvedValue({
        id: "user-1",
        username: "demo",
        password: "hashed",
        isVerified: true,
      });
      (mockPasswordHash.verify as any).mockReturnValue(true);

      const result = await authService.signIn("demo", "password");

      expect(result).toBe("mock-token");
    });
  });

  describe("signUp", () => {
    it("should create new user", async () => {
      (mockUserService.createUser as any).mockResolvedValue({
        id: "new-user",
        username: "testuser",
        email: "test@example.com",
      });

      const result = await authService.signUp({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      });

      expect(result.username).toBe("testuser");
    });
  });

  describe("me", () => {
    it("should throw NotFoundException for non-existent user", async () => {
      (mockUserService.findOne as any).mockResolvedValue(null);

      await expect(authService.me("non-existent")).rejects.toThrow(
        NotFoundException
      );
    });

    it("should return user for existing user ID", async () => {
      (mockUserService.findOne as any).mockResolvedValue({
        id: "demo-user",
        username: "demo",
        email: "demo@example.com",
      });

      const result = await authService.me("demo-user");

      expect(result.username).toBe("demo");
    });
  });
});
