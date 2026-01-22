import { describe, expect, it } from "vitest";
import * as Module from "./index";

describe("Orchestrator Index", () => {
  it("should export runOrchestratorStep", () => {
    expect(Module.runOrchestratorStep).toBeDefined();
  });
});
