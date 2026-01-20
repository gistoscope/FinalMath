import { LocalInvariantSet } from "../../invarient-registry.type";

/**
 * Stage-1 Fraction Invariants
 */

export const FRACTIONS_SAME_DEN_STAGE1: LocalInvariantSet = {
  id: "fractions-same-den-stage1",
  rules: [
    {
      id: "R.FRAC_ADD_SAME",
      stage: "Stage1",
      domain: "FractionsSameDen",
      operation: "Add",
      pattern: {
        operator: "+",
        requiresFractions: true,
        requireSameDenominator: true,
      },
      primitiveIds: ["P.FRAC_ADD_SAME_DEN"],
    },
    {
      id: "R.FRAC_SUB_SAME",
      stage: "Stage1",
      domain: "FractionsSameDen",
      operation: "Sub",
      pattern: {
        operator: "-",
        requiresFractions: true,
        requireSameDenominator: true,
      },
    },
    // NEW: Equivalent fraction expansion
    {
      id: "R.FRAC_EQUIV",
      stage: "Stage1",
      domain: "FractionsSameDen",
      operation: "Equiv",
      pattern: {
        operator: undefined, // applies to fraction node itself
        requiresFractions: true,
      },
      primitiveIds: ["P.FRAC_EQUIV"],
    },
  ],
};
