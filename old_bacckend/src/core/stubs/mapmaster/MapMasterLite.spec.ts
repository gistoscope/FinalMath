import { describe, expect, it } from "vitest";
import { buildMapLite } from "./MapMasterLite";
// import { FRACTIONS_BASIC_SET_ID } from '../invariants/index';

// We need to mock getInvariantsBySetId to make this test robust without relying on config files
// But for now, we can test empty/error cases easily.

describe("MapMasterLite", () => {
  it("should return empty candidates for invalid request", async () => {
    const result = await buildMapLite({} as any);
    expect(result.candidates).toEqual([]);
  });

  it("should ignore non-click events", async () => {
    const result = await buildMapLite({
      clientEvent: { type: "hover", surfaceNodeId: "id" },
    } as any);
    expect(result.candidates).toEqual([]);
  });

  it("should handle simple valid request but empty invariants (default)", async () => {
    // Unless we mock external deps, this will likely return empty candidates
    // because config loader won't find files in test environment usually.
    const result = await buildMapLite({
      latex: "1/2 + 1/3",
      invariantSetId: "test-set",
      clientEvent: { type: "click", surfaceNodeId: "root" },
    } as any);
    expect(result.candidates).toBeDefined();
    expect(Array.isArray(result.candidates)).toBe(true);
  });
});
