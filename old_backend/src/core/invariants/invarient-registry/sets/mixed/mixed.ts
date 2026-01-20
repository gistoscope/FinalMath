import { LocalInvariantSet } from "../../invarient-registry.type";

/**
 * Stage-1 Mixed Invariants
 */

export const MIXED_STAGE1: LocalInvariantSet = {
  id: "mixed-stage1",
  rules: [
    // R.INT_PLUS_FRAC and R.INT_MINUS_FRAC are in Default Set
    {
      id: "R.INT_PLUS_FRAC",
      stage: "Stage1",
      domain: "Mixed",
      operation: "Add",
      pattern: {
        operator: "+",
        allowsMixed: true,
      },
      primitiveIds: ["P.INT_PLUS_FRAC"],
    },
    {
      id: "R.INT_MINUS_FRAC",
      stage: "Stage1",
      domain: "Mixed",
      operation: "Sub",
      pattern: {
        operator: "-",
        allowsMixed: true,
      },
      primitiveIds: ["P.INT_MINUS_FRAC"],
    },
  ],
};
