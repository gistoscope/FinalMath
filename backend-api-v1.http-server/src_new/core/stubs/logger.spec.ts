import { describe, expect, it } from "vitest";
import { logger } from "./logger";

describe("Logger Stub", () => {
  it("should export a logger instance", () => {
    expect(logger).toBeDefined();
  });

  it("should have basic logging methods", () => {
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });
});
