import { LocalInvariantSet } from "../../invarient-registry.type";

/**
 * Stage-1 Integer Invariants
 */

export const INTEGERS_STAGE1: LocalInvariantSet = {
  id: "integers-stage1",
  rules: [
    {
      id: "R.INT_ADD",
      stage: "Stage1",
      domain: "Integers",
      operation: "Add",
      pattern: {
        operator: "+",
        requiresIntegers: true,
      },
      primitiveIds: ["P.INT_ADD"],
    },
    {
      id: "R.INT_SUB",
      stage: "Stage1",
      domain: "Integers",
      operation: "Sub",
      pattern: {
        operator: "-",
        requiresIntegers: true,
      },
      primitiveIds: ["P.INT_SUB"],
    },
    {
      id: "R.INT_MUL",
      stage: "Stage1",
      domain: "Integers",
      operation: "Mul",
      pattern: {
        operator: "*",
        requiresIntegers: true,
      },
      primitiveIds: ["P.INT_MUL"],
    },
    {
      id: "R.INT_DIV_EXACT",
      stage: "Stage1",
      domain: "Integers",
      operation: "Div",
      pattern: {
        operator: "/",
        requiresIntegers: true,
      },
    },
    // NEW: Integer to Fraction
    {
      id: "R.INT_TO_FRAC",
      stage: "Stage1",
      domain: "Integers",
      operation: "Normalize",
      pattern: {
        requiresIntegers: true,
      },
      primitiveIds: ["P.INT_TO_FRAC"],
    },
  ],
};
