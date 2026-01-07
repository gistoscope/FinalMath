import { describe, expect, it } from "vitest";
import { loadInvariantRegistryFromFile } from "./invariant-course-loader";

describe("Invariant Course Loader", () => {
  // Similar constraint: file system dependency.
  // We can test that it throws on invalid path if we want, or just check exports.

  it("should export load function", () => {
    expect(loadInvariantRegistryFromFile).toBeDefined();
  });

  it("should throw on missing file", () => {
    expect(() => {
      loadInvariantRegistryFromFile({ path: "/non/existent/path.json" });
    }).toThrow();
  });
});
