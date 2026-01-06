import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authService as legacyAuth } from "../../core/stubs";
import { UserService } from "./user.service";

vi.mock("../../core/stubs", () => ({
  authService: {
    getUserById: vi.fn(),
    getUserByUsername: vi.fn(),
    register: vi.fn(),
  },
}));

describe("UserService", () => {
  let userService: UserService;

  beforeEach(() => {
    vi.resetAllMocks();
    userService = new UserService();
  });

  describe("findOne", () => {
    it("should return mapped user for id lookup", async () => {
      const legacyUser = {
        id: "u1",
        username: "test",
        password: "p",
        role: "student",
      };
      vi.mocked(legacyAuth.getUserById).mockResolvedValue(legacyUser as any);

      const user = await userService.findOne({ id: "u1" });

      expect(user?.id).toBe("u1");
      expect(user?.email).toBe("");
      expect(user?.isVerified).toBe(true);
    });

    it("should return mapped user for username lookup", async () => {
      const legacyUser = {
        id: "u1",
        username: "demo",
        password: "p",
        role: "student",
      };
      vi.mocked(legacyAuth.getUserByUsername).mockResolvedValue(
        legacyUser as any
      );

      const user = await userService.findOne({ username: "demo" });

      expect(user?.username).toBe("demo");
    });

    it("should support OR conditions (find by username)", async () => {
      const legacyUser = {
        id: "u1",
        username: "demo",
        password: "p",
        role: "student",
      };
      vi.mocked(legacyAuth.getUserByUsername).mockResolvedValue(
        legacyUser as any
      );

      const user = await userService.findOne({
        OR: [{ username: "demo" }, { email: "ignored" }],
      });

      expect(user?.username).toBe("demo");
    });

    it("should return null if user not found", async () => {
      vi.mocked(legacyAuth.getUserById).mockResolvedValue(null);
      const user = await userService.findOne({ id: "missing" });
      expect(user).toBeNull();
    });
  });

  describe("createUser", () => {
    it("should map legacy user on create", async () => {
      const legacyUser = {
        id: "new",
        username: "new",
        password: "p",
        role: "student",
      };
      vi.mocked(legacyAuth.register).mockResolvedValue(legacyUser as any);

      const user = await userService.createUser({
        username: "new",
        email: "e",
        password: "p",
      });

      expect(user.username).toBe("new");
      expect(user.role).toBe("student");
    });
  });
});
