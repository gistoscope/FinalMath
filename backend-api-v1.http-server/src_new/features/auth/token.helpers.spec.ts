import jwt from "jsonwebtoken";
import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { Token } from "./token.helpers";

describe("Token", () => {
  const tokenHelper = new Token();

  it("should generate a valid JWT", () => {
    const payload = {
      id: "user-1",
      email: "test@example.com",
      username: "testuser",
      role: { role: "student" },
    };

    const token = tokenHelper.generate(payload);
    expect(token).toBeDefined();

    const decoded = jwt.decode(token) as any;
    expect(decoded.userId).toBe(payload.id);
    // Legacy token does not include email
    expect(decoded.username).toBe(payload.username);
    expect(decoded.role).toBe("student");
  });
});
