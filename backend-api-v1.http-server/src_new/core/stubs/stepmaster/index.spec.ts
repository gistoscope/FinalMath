import { describe, expect, it } from "vitest";
import * as Module from "./index";

describe("StepMaster Index", () => {
  it("should export modules", () => {
    expect(Module).toBeDefined();
  });
});
