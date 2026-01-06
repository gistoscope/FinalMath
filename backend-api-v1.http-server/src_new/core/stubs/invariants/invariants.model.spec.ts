import { describe, expect, it } from "vitest";
import { validateInvariantModel } from "./invariants.model";

describe("Invariants Model Validation", () => {
  const validPrimitive = {
    id: "P1",
    name: "Prim1",
    description: "Desc",
    category: "Cat",
    tags: ["tag1"],
  };

  const validSet = {
    id: "S1",
    name: "Set1",
    description: "Desc",
    version: "1.0",
    rules: [
      {
        id: "R1",
        title: "Rule1",
        shortStudentLabel: "Label",
        description: "Desc",
        level: "core",
        tags: ["tag"],
        primitiveIds: ["P1"],
      },
    ],
  };

  it("should validate a correct model", () => {
    const model = {
      primitives: [validPrimitive],
      invariantSets: [validSet],
    };

    const result = validateInvariantModel(model);
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("should fail if primitive ID is missing", () => {
    const invalidPrim = { ...validPrimitive, id: "" };
    const model = {
      primitives: [invalidPrim],
      invariantSets: [],
    };
    const result = validateInvariantModel(model);
    expect(result.ok).toBe(false);
    expect(result.issues[0].code).toBe("INVALID_PRIMITIVE_FIELD");
  });

  it("should fail if rule references unknown primitive", () => {
    const invalidSet = {
      ...validSet,
      rules: [
        {
          ...validSet.rules[0],
          primitiveIds: ["UNKNOWN_P"],
        },
      ],
    };

    const model = {
      primitives: [validPrimitive],
      invariantSets: [invalidSet],
    };

    const result = validateInvariantModel(model);
    expect(result.ok).toBe(false);
    expect(result.issues[0].code).toBe("UNKNOWN_PRIMITIVE_ID");
  });

  it("should fail on duplicate primitive IDs", () => {
    const model = {
      primitives: [validPrimitive, validPrimitive],
      invariantSets: [],
    };
    const result = validateInvariantModel(model);
    expect(result.ok).toBe(false);
    expect(result.issues[0].code).toBe("DUPLICATE_PRIMITIVE_ID");
  });
});
