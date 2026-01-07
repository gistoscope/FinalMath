import { describe, expect, it } from "vitest";
import * as Module from "./index";

describe("Invariants Index", () => {
  it("should export registry", () => {
    expect(Module.InMemoryInvariantRegistry).toBeDefined();
  });
});
