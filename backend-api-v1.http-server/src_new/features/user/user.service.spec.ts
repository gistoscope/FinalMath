/**
 * User Service Tests
 */

import "reflect-metadata";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";
import { UserService } from "./user.service";

describe("UserService", () => {
  let userService: UserService;

  beforeEach(() => {
    container.clearInstances();
    userService = container.resolve(UserService);
  });

  describe("findOne", () => {
    it("should return demo user for id match", async () => {
      const user = await userService.findOne({ id: "demo-user" });

      expect(user).not.toBeNull();
      expect(user?.username).toBe("demo");
      expect(user?.email).toBe("demo@example.com");
    });

    it("should return null for non-existent user", async () => {
      const user = await userService.findOne({ id: "non-existent" });
      expect(user).toBeNull();
    });

    it("should support OR conditions", async () => {
      const user = await userService.findOne({
        OR: [{ username: "demo" }, { email: "other@example.com" }],
      });

      expect(user).not.toBeNull();
      expect(user?.username).toBe("demo");
    });
  });

  describe("createUser", () => {
    it("should create a new user", async () => {
      const newUser = await userService.createUser({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      });

      expect(newUser).toBeDefined();
      expect(newUser.username).toBe("testuser");
      expect(newUser.email).toBe("test@example.com");
      expect(newUser.isVerified).toBe(false);
    });

    it("should assign default student role", async () => {
      const newUser = await userService.createUser({
        username: "student1",
        email: "student@example.com",
        password: "password",
      });

      expect(newUser.role.role).toBe("student");
    });
  });

  describe("findAll", () => {
    it("should return array of users", async () => {
      const users = await userService.findAll();

      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0); // Demo user exists
    });
  });

  describe("update", () => {
    it("should return null for non-existent user", async () => {
      const result = await userService.update("non-existent", {
        username: "new",
      });
      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("should return false for non-existent user", async () => {
      const result = await userService.delete("non-existent");
      expect(result).toBe(false);
    });
  });
});
