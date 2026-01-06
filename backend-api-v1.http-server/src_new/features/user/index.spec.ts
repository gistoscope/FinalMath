import "reflect-metadata";
import { describe, expect, it } from "vitest";
import * as Module from "./index";
import { UserService } from "./user.service";

describe("User Feature Index", () => {
  it("should export UserService", () => {
    expect(Module.UserService).toBeDefined();
    // Depending on module system, it might be the class constructor
    expect(Module.UserService).toBe(UserService);
  });
});
