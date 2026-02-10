import { LocalInvariantSet } from "../../invarient-registry.type";

/**
 * Stage-1 Generic Fraction Invariants (Mul/Div)
 */

export const FRACTIONS_GENERIC_STAGE1: LocalInvariantSet = {
  id: "fractions-generic-stage1",
  rules: [
    {
      id: "R.FRAC_MUL",
      stage: "Stage1",
      domain: "Fractions",
      operation: "Mul",
      pattern: {
        operator: "*",
        requiresFractions: true,
        requireSameDenominator: false,
      },
      primitiveIds: ["P.FRAC_MUL"],
    },
    {
      id: "R.FRAC_DIV",
      stage: "Stage1",
      domain: "Fractions",
      operation: "Div",
      pattern: {
        operator: "/",
        requiresFractions: true,
        requireSameDenominator: false,
      },
      primitiveIds: ["P.FRAC_DIV"],
    },
    {
      id: "R.FRAC_ADD_DIFF",
      stage: "Stage1",
      domain: "Fractions",
      operation: "Add",
      pattern: {
        operator: "+",
        requiresFractions: true,
        requireSameDenominator: false,
      },
      primitiveIds: ["P.FRAC_ADD_DIFF"],
    },
    {
      id: "R.FRAC_SUB_DIFF",
      stage: "Stage1",
      domain: "Fractions",
      operation: "Sub",
      pattern: {
        operator: "-",
        requiresFractions: true,
        requireSameDenominator: false,
      },
      primitiveIds: ["P.FRAC_SUB_DIFF"],
    },
  ],
};
