// Import core types from the canonical source
import type {
  InvariantRuleDefinition,
  InvariantRuleId,
  InvariantRuleLevel,
  InvariantSetId,
  PrimitiveDefinition,
  PrimitiveId,
} from "../invariant.types";

/**
 * Pattern specification for an invariant rule.
 * Used to determine when a rule is applicable to an AST node.
 */
export interface InvariantPattern {
  /**
   * The operator this rule applies to (e.g., "+", "-", "*", "/").
   */
  operator?: string;

  /**
   * Whether this rule requires operands to be fractions.
   */
  requiresFractions?: boolean;

  /**
   * Whether this rule requires fractions to have the same denominator.
   */
  requireSameDenominator?: boolean;

  /**
   * Whether this rule requires operands to be integers.
   */
  requiresIntegers?: boolean;

  /**
   * Whether this rule applies to mixed numbers (integer + fraction).
   */
  allowsMixed?: boolean;

  /**
   * Additional custom constraints.
   */
  custom?: Record<string, any>;
}

/**
 * Local definition of an invariant rule with pattern metadata.
 */
export interface LocalInvariantRule {
  id: string;
  stage: string;
  domain: string;
  operation?: string;
  pattern?: InvariantPattern;
  primitiveIds?: string[];
}

/**
 * A collection of related invariant rules (local definition).
 */
export interface LocalInvariantSet {
  id: string;
  rules: LocalInvariantRule[];
}

// Re-export the imported types for convenience
export type {
  InvariantRuleDefinition,
  InvariantRuleId,
  InvariantRuleLevel,
  InvariantSetId,
  PrimitiveDefinition,
  PrimitiveId,
};
