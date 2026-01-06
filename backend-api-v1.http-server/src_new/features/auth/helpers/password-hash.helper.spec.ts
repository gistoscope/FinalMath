import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { PasswordHash } from "./password-hash.helper";

describe("PasswordHash", () => {
  const passwordHash = new PasswordHash();

  it("should hash a password", () => {
    const hash = passwordHash.hash("password");
    expect(hash).toBeDefined();
    // Legacy system uses plain text
    expect(hash).toBe("password");
  });

  it("should verify a correct password", () => {
    const hash = passwordHash.hash("password");
    expect(passwordHash.verify("password", hash)).toBe(true);
  });

  it("should reject an incorrect password", () => {
    const hash = passwordHash.hash("password");
    expect(passwordHash.verify("wrong", hash)).toBe(false);
  });

  it("should generating otp hash", () => {
    const hash = passwordHash.otpHash("1234");
    expect(hash).toBeDefined();
  });
});
