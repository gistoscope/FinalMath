import { describe, expect, it } from "vitest";
import { PRIMITIVE_DEFINITIONS } from "./primitives.registry";
import { PRIMITIVES_V5_TABLE } from "./primitives.registry.v5";

describe("Primitives Registry (Legacy Wrapper)", () => {
  it("should export PRIMITIVE_DEFINITIONS derived from V5 table", () => {
    expect(PRIMITIVE_DEFINITIONS).toBeDefined();
    // Check V5 table is not empty
    expect(PRIMITIVES_V5_TABLE.rows.length).toBeGreaterThan(0);

    // Check that legacy definition matches V5 id
    const firstId = PRIMITIVES_V5_TABLE.rows[0].id;
    expect(PRIMITIVE_DEFINITIONS[firstId]).toBeDefined();
    expect(PRIMITIVE_DEFINITIONS[firstId].id).toBe(firstId);
    expect(PRIMITIVE_DEFINITIONS[firstId].section).toBe("A"); // Checked dummy value
  });

  it("should contain description from label or notes", () => {
    const row = PRIMITIVES_V5_TABLE.rows.find((r) => r.notes);
    if (row) {
      expect(PRIMITIVE_DEFINITIONS[row.id].description).toBe(row.notes);
    }
  });

  it("should construct pattern string", () => {
    const row = PRIMITIVES_V5_TABLE.rows.find((r) => r.operatorLatex);
    if (row && row.operatorLatex) {
      expect(PRIMITIVE_DEFINITIONS[row.id].pattern).toBe(
        `a ${row.operatorLatex} b`
      );
    }
  });
});
