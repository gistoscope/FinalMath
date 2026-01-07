import { describe, expect, it } from "vitest";
import * as Module from "./index";

describe("Engine Index", () => {
  it("should export legacy bridge exports", () => {
    expect(Module.executeStepViaEngine).toBeDefined();
  });
});
