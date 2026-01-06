/**
 * Step Service Tests
 */

import "reflect-metadata";
import { beforeEach, describe, expect, it } from "vitest";
import { StepService } from "./step.service";

describe("StepService", () => {
  let service: StepService;

  beforeEach(() => {
    service = new StepService();
  });

  describe("handleStep", () => {
    it("should throw deprecated error", async () => {
      await expect(service.handleStep({})).rejects.toThrow(
        "StepService is deprecated"
      );
    });
  });
});
