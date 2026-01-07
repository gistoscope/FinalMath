/**
 * Core Errors Tests
 */

import { describe, expect, it } from "vitest";
import {
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
  ValidationException,
} from "./index";

describe("Core Errors", () => {
  describe("HttpException", () => {
    it("should create with default message", () => {
      const error = new HttpException("Test error", 400);
      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(400);
    });

    it("should be an instance of Error", () => {
      const error = new HttpException("Error", 500);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("NotFoundException", () => {
    it("should create with default message", () => {
      const error = new NotFoundException();
      expect(error.statusCode).toBe(404);
    });

    it("should create with custom message", () => {
      const error = new NotFoundException("Resource not found");
      expect(error.message).toBe("Resource not found");
      expect(error.statusCode).toBe(404);
    });
  });

  describe("UnauthorizedException", () => {
    it("should create with default message", () => {
      const error = new UnauthorizedException();
      expect(error.statusCode).toBe(401);
    });

    it("should create with custom message", () => {
      const error = new UnauthorizedException("Invalid token");
      expect(error.message).toBe("Invalid token");
      expect(error.statusCode).toBe(401);
    });
  });

  describe("ForbiddenException", () => {
    it("should create with default message", () => {
      const error = new ForbiddenException();
      expect(error.statusCode).toBe(403);
    });

    it("should create with custom message", () => {
      const error = new ForbiddenException("Access denied");
      expect(error.message).toBe("Access denied");
      expect(error.statusCode).toBe(403);
    });
  });

  describe("ValidationException", () => {
    it("should create with validation errors", () => {
      const errors = [{ property: "email", constraints: ["Invalid email"] }];
      const error = new ValidationException(errors);
      expect(error.statusCode).toBe(400);
      expect(error.all).toEqual([
        { field: "email", message: ["Invalid email"] },
      ]);
    });
  });
});
