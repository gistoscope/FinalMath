import { LocalInvariantSet } from "../invarient-registry.type";
import { FRACTIONS_GENERIC_STAGE1, FRACTIONS_SAME_DEN_STAGE1 } from "./fractions";
import { INTEGERS_STAGE1 } from "./integer";
import { MIXED_STAGE1 } from "./mixed";

/**
 * Registry of all Stage-1 invariant sets.
 */

export const STAGE1_INVARIANT_SETS: LocalInvariantSet[] = [
  FRACTIONS_SAME_DEN_STAGE1,
  FRACTIONS_GENERIC_STAGE1,
  INTEGERS_STAGE1,
  MIXED_STAGE1,
];
