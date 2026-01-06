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
      verify: vi.fn(),
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
        password: "p",
      });
      (mockPasswordHash.verify as any).mockReturnValue(false);

      await expect(authService.signIn("demo", "wrongpassword")).rejects.toThrow(
        ValidationException
      );
    });

    it("should return token for valid credentials", async () => {
      const user = {
        id: "user-1",
        username: "demo",
        password: "p",
      };
      (mockUserService.findOne as any).mockResolvedValue(user);
      (mockPasswordHash.verify as any).mockReturnValue(true);

      const result = await authService.signIn("demo", "password");

      expect(result).toBe("mock-token");
    });
  });

  describe("signUp", () => {
    it("should create new user", async () => {
      const newUser = { id: "u2", username: "new" };
      (mockUserService.createUser as any).mockResolvedValue(newUser);

      const result = await authService.signUp({
        username: "new",
        email: "e",
        password: "p",
      });

      expect(result).toBe(newUser);
    });
  });

  describe("me", () => {
    it("should throw NotFoundException if user missing", async () => {
      (mockUserService.findOne as any).mockResolvedValue(null);
      await expect(authService.me("missing")).rejects.toThrow(
        NotFoundException
      );
    });

    it("should return user data", async () => {
      const user = { id: "u1" };
      (mockUserService.findOne as any).mockResolvedValue(user);
      const result = await authService.me("u1");
      expect(result).toBe(user);
    });
  });
});
