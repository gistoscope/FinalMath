/**
 * Invariant Types
 *
 * Type definitions for the invariants model.
 * These are the core domain types used throughout the application.
 */

/** Identifier for primitive operations. */
export type PrimitiveId = string & { __brand: "PrimitiveId" };

/** Identifier of an invariant rule. */
export type InvariantRuleId = string;

/** Identifier of an invariant set (course pack). */
export type InvariantSetId = string;

/**
 * Difficulty / progression level of an invariant rule.
 */
export type InvariantRuleLevel = "intro" | "core" | "advanced" | "challenge";

/** Valid invariant rule levels */
export const VALID_LEVELS: readonly InvariantRuleLevel[] = [
  "intro",
  "core",
  "advanced",
  "challenge",
] as const;

/**
 * Definition of a primitive operation used by the course.
 */
export interface PrimitiveDefinition {
  /** Stable identifier, referenced from invariant rules. */
  id: PrimitiveId;

  /** Short human‑readable name, e.g. "Multiply by 1 in disguise". */
  name: string;

  /** One‑sentence description for teacher tools / debugging. */
  description: string;

  /** Logical category, e.g. "fractions", "integers", "arithmetics". */
  category?: string;

  /** Free‑form tag list for filtering / search in tools. */
  tags?: string[];

  /** Algebraic pattern, e.g. "a + b" or "a/c + b/c". */
  pattern?: string;

  /** Result pattern, e.g. "calc(a+b)" or "(a+b)/c". */
  resultPattern?: string;
}

/**
 * Definition of a single invariant rule.
 */
export interface InvariantRuleDefinition {
  /** Stable identifier, referenced from MapMaster and analytics. */
  id: InvariantRuleId;

  /** Short human‑readable title. */
  title: string;

  /** Student‑facing one‑line label. */
  shortStudentLabel: string;

  /** Optional teacher‑facing label or note. */
  teacherLabel?: string;

  /** Longer description for documentation / teacher UI. */
  description: string;

  /** Coarse difficulty / progression level. */
  level: InvariantRuleLevel;

  /** Free‑form tag list. */
  tags: string[];

  /** IDs of primitives that this rule may trigger. */
  primitiveIds: PrimitiveId[];

  /** Optional scenario identifier. */
  scenarioId?: string;

  /** Optional teaching tag. */
  teachingTag?: string;
}

/**
 * A set groups rules into a course pack.
 */
export interface InvariantSetDefinition {
  /** Stable identifier. */
  id: InvariantSetId;

  /** Human‑readable name. */
  name: string;

  /** Short description for teacher tools. */
  description: string;

  /** Semantic version string. */
  version: string;

  /** Ordered list of rules included in this set. */
  rules: InvariantRuleDefinition[];
}

/**
 * Complete model definition containing all primitives and invariant sets.
 */
export interface InvariantModelDefinition {
  /** All known primitives. */
  primitives: PrimitiveDefinition[];

  /** All available invariant sets. */
  invariantSets: InvariantSetDefinition[];
}

/**
 * A single validation issue found in the model.
 */
export interface InvariantModelIssue {
  /** Machine‑readable code. */
  code: string;

  /** Path to the offending field. */
  path: string;

  /** Human‑readable message. */
  message: string;
}

/**
 * Result of validating an invariant model.
 */
export interface InvariantModelValidationResult {
  /** True when the model is structurally valid. */
  ok: boolean;

  /** List of issues. Empty when ok === true. */
  issues: InvariantModelIssue[];

  /** Normalized model if ok === true. */
  model?: InvariantModelDefinition;
}
