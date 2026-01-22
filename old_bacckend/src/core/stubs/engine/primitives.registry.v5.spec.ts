import { describe, expect, it } from "vitest";
import { PRIMITIVES_V5_TABLE } from "./primitives.registry.v5";

describe("Primitives Registry V5", () => {
  it("should have correct version", () => {
    expect(PRIMITIVES_V5_TABLE.version).toBe("v5.0.0");
  });

  it("should have unique primitive IDs", () => {
    const ids = PRIMITIVES_V5_TABLE.rows.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should have required fields for all rows", () => {
    PRIMITIVES_V5_TABLE.rows.forEach((row) => {
      expect(row.id).toBeDefined();
      expect(row.domain).toBeDefined();
      expect(row.category).toBeDefined();
      expect(row.clickTargetKind).toBeDefined();
      expect(row.color).toBeDefined();
      expect(row.uiMode).toBeDefined();
      expect(row.actionClass).toBeDefined();
      expect(row.label).toBeDefined();
    });
  });

  it("should validate specific known primitives", () => {
    const add = PRIMITIVES_V5_TABLE.rows.find((r) => r.id === "P.INT_ADD");
    expect(add).toBeDefined();
    expect(add?.operatorLatex).toBe("+");
    expect(add?.domain).toBe("integers");
  });
});
