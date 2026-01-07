import { describe, expect, it } from "vitest";
import { InvariantModelDefinition } from "./invariants.model";
import { InMemoryInvariantRegistry } from "./invariants.registry";

describe("InMemoryInvariantRegistry", () => {
  const mockModel: InvariantModelDefinition = {
    primitives: [
      {
        id: "P1",
        name: "Prim1",
        description: "Desc",
        tags: [],
      },
    ],
    invariantSets: [
      {
        id: "S1",
        name: "Set1",
        description: "Desc",
        version: "1.0",
        rules: [
          {
            id: "R1",
            title: "Rule1",
            shortStudentLabel: "R1",
            description: "Desc",
            level: "core",
            tags: [],
            primitiveIds: ["P1"],
          },
        ],
      },
    ],
  };

  const registry = new InMemoryInvariantRegistry({ model: mockModel });

  it("should retrieve primitive by ID", () => {
    const p = registry.getPrimitiveById("P1");
    expect(p).toBeDefined();
    expect(p?.id).toBe("P1");
  });

  it("should retrieve invariant set by ID", () => {
    const s = registry.getInvariantSetById("S1");
    expect(s).toBeDefined();
    expect(s?.id).toBe("S1");
  });

  it("should find rule by set ID and rule ID", () => {
    const r = registry.findRule("S1", "R1");
    expect(r).toBeDefined();
    expect(r?.id).toBe("R1");
  });

  it("should find rules by primitive ID", () => {
    const rules = registry.findRulesByPrimitiveId("P1");
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe("R1");
  });

  it("should return undefined/empty for missing items", () => {
    expect(registry.getPrimitiveById("MISSING")).toBeUndefined();
    expect(registry.getInvariantSetById("MISSING")).toBeUndefined();
    expect(registry.findRulesByPrimitiveId("MISSING")).toEqual([]);
  });

  it("should return clones to prevent mutation", () => {
    const p = registry.getPrimitiveById("P1");
    if (p) {
      (p as any).mutated = true;
      const p2 = registry.getPrimitiveById("P1");
      expect((p2 as any).mutated).toBeUndefined();
    }
  });
});
