import { describe, expect, it } from "vitest";
import { createStubInvariantRegistry } from "./index";

describe("Stubs Index", () => {
  describe("createStubInvariantRegistry", () => {
    it("should create a registry with getInvariantSetById", () => {
      const registry = createStubInvariantRegistry();
      expect(registry.getInvariantSetById).toBeDefined();
      expect(typeof registry.getInvariantSetById).toBe("function");
    });

    it("should return a stubbed invariant set", () => {
      const registry = createStubInvariantRegistry();
      const set = registry.getInvariantSetById("test-id");

      expect(set).toEqual({
        id: "test-id",
        name: "Stub Set: test-id",
        rules: [],
      });
    });
  });
});
