import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundException, ValidationException } from "../../core/errors";
import { UserService } from "../user/user.service";
import { AuthService } from "./auth.service";
import { Token } from "./token.helpers";

describe("AuthService", () => {
  let authService: AuthService;
  let mockUserService: Partial<UserService>;
  let mockToken: Partial<Token>;

  beforeEach(() => {
    mockUserService = {
      getUserByUsername: vi.fn(),
      getUserById: vi.fn(),
      createUser: vi.fn(),
    };

    mockToken = {
      generate: vi.fn().mockReturnValue("mock-token"),
    };

    authService = new AuthService(
      mockUserService as UserService,
      mockToken as Token
    );
  });

  describe("signIn", () => {
    it("should throw ValidationException for non-existent user", async () => {
      // Logic assumes getUserByUsername returns null/undefined if not found
      // (even if actual implementation might throw, in unit test we define contract for AuthService)
      (mockUserService.getUserByUsername as any).mockResolvedValue(null);

      await expect(
        authService.signIn("nonexistent", "password")
      ).rejects.toThrow(ValidationException);
    });

    it("should throw ValidationException for wrong password", async () => {
      (mockUserService.getUserByUsername as any).mockResolvedValue({
        id: "user-1",
        username: "demo",
        password: "p",
        role: "student",
      });

      await expect(authService.signIn("demo", "wrongpassword")).rejects.toThrow(
        ValidationException
      );
    });

    it("should return token for valid credentials", async () => {
      const user = {
        id: "user-1",
        username: "demo",
        password: "p",
        role: "student",
      };
      (mockUserService.getUserByUsername as any).mockResolvedValue(user);

      const result = await authService.signIn("demo", "p");

      expect(result).toBe("mock-token");
      expect(mockToken.generate).toHaveBeenCalledWith({
        id: "user-1",
        username: "demo",
        role: "student",
      });
    });
  });

  describe("signUp", () => {
    it("should create new user", async () => {
      const newUser = {
        id: "u2",
        username: "new",
        password: "p",
        role: "student",
      };
      // First check finds nothing
      (mockUserService.getUserByUsername as any).mockResolvedValue(undefined);
      (mockUserService.createUser as any).mockResolvedValue(newUser);

      const result = await authService.signUp({
        username: "new",
        email: "e",
        password: "p",
      });

      expect(result).toBe(newUser);
      expect(mockUserService.createUser).toHaveBeenCalledWith({
        username: "new",
        email: "e",
        password: "p",
      });
    });

    it("should throw error if username exists", async () => {
      (mockUserService.getUserByUsername as any).mockResolvedValue({
        id: "u1",
      });

      await expect(
        authService.signUp({
          username: "existing",
          email: "e",
          password: "p",
        })
      ).rejects.toThrow("Username already exists");
    });
  });

  describe("me", () => {
    it("should throw NotFoundException if user missing", async () => {
      (mockUserService.getUserById as any).mockResolvedValue(null);
      await expect(authService.me("missing")).rejects.toThrow(
        NotFoundException
      );
    });

    it("should return user data", async () => {
      const user = { id: "u1" };
      (mockUserService.getUserById as any).mockResolvedValue(user);
      const result = await authService.me("u1");
      expect(result).toBe(user);
    });
  });
});
