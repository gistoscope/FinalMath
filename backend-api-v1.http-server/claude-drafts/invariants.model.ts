/**
 * @module invariants.model
 *
 * Core data model for primitives and invariant rules. This module defines
 * the structure of teaching rules, their organization into sets, and
 * validation logic to ensure model integrity.
 *
 * This model is independent from MapMaster/StepMaster execution logic
 * and focuses purely on describing "what rules exist in this course".
 */

import type { InvariantSetId } from './mapmaster.core';

/** Unique identifier for an invariant rule. */
export type InvariantRuleId = string;

/** Unique identifier for a primitive operation. */
export type PrimitiveId = string;

/**
 * Definition of a primitive operation - a micro-operation the engine can perform.
 * Primitives are the atomic building blocks referenced by invariant rules.
 */
export interface PrimitiveDefinition {
  /** Stable identifier, referenced from invariant rules. */
  id: PrimitiveId;

  /** Short human-readable name, e.g. "Multiply by 1 in disguise". */
  name: string;

  /** One-sentence description shown to teachers / debugging tools. */
  description: string;

  /** Logical category, e.g. "fractions", "integers", "arithmetics" – free-form. */
  category: string;

  /** Free-form tag list for filtering/searching in teacher tools. */
  tags: string[];
}

/** Difficulty/progression level for an invariant rule. */
export type InvariantRuleLevel = 'intro' | 'core' | 'advanced' | 'challenge';

/**
 * Definition of an invariant rule - a teaching rule that may reference primitives.
 * Rules describe valid algebraic transformations and are the primary unit
 * of teaching logic.
 */
export interface InvariantRuleDefinition {
  /** Stable identifier, referenced from MapMaster candidates and analytics. */
  id: InvariantRuleId;

  /** Short human-readable title, e.g. "Common denominator by multiplying by 1". */
  title: string;

  /** Student-facing one-line label. */
  shortStudentLabel: string;

  /** Optional teacher-facing label or note. */
  teacherLabel?: string;

  /** Longer description for documentation / teacher UI. */
  description: string;

  /** Coarse difficulty / progression level. */
  level: InvariantRuleLevel;

  /** Free-form tag list (e.g. ["fractions", "add", "common-denominator"]). */
  tags: string[];

  /**
   * IDs of primitives that this rule may trigger.
   * This is a soft link used by analytics and tooling; the engine stays separate.
   */
  primitiveIds: PrimitiveId[];
}

/**
 * A set groups rules into a course pack - the unit we swap in/out for different curricula.
 * Each set represents a cohesive collection of teaching rules.
 */
export interface InvariantSetDefinition {
  /** Stable identifier used by MapMasterRequest.expression.invariantSetId. */
  id: InvariantSetId;

  /** Human-readable name, e.g. "Fractions – beginner". */
  name: string;

  /** Short description for teacher tools. */
  description: string;

  /** Semantic version string, e.g. "1.0.0" or "2025.03". */
  version: string;

  /** Ordered list of rules included in this set. */
  rules: InvariantRuleDefinition[];
}

/**
 * Complete model definition containing all primitives and invariant sets.
 * This is the root structure that defines a curriculum.
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
  /** Machine-readable code, e.g. "DUPLICATE_PRIMITIVE_ID". */
  code: string;

  /** JSON-pointer-like or dot-path to the offending field, e.g. "primitives[0].id". */
  path: string;

  /** Human-readable message for logs / teacher tools. */
  message: string;
}

/**
 * Result of validating an invariant model.
 * Contains validation status, issues found, and normalized model if valid.
 */
export interface InvariantModelValidationResult {
  /** True when the model is structurally valid (no issues). */
  ok: boolean;

  /**
   * List of issues. Empty when ok === true.
   * If ok === true, issues MUST be [] (not null/undefined).
   */
  issues: InvariantModelIssue[];

  /**
   * Normalized copy of the model.
   * Present only when ok === true.
   * Arrays must be shallow-copied; objects must be shallow-copied.
   */
  model?: InvariantModelDefinition;
}

/** Valid invariant rule levels */
const VALID_LEVELS: readonly InvariantRuleLevel[] = ['intro', 'core', 'advanced', 'challenge'];

/**
 * Validate the complete invariant model for structural integrity.
 *
 * This function performs comprehensive validation including:
 * - Shape validation (correct object structure)
 * - Field validation (non-empty strings, correct types)
 * - Duplicate detection (IDs must be unique)
 * - Referential integrity (primitive IDs must exist)
 *
 * If validation passes, returns a normalized copy of the model with
 * all arrays and objects shallow-copied to prevent mutation.
 *
 * @param input - The model to validate (unknown type for safety)
 * @returns Validation result with ok status, issues, and normalized model
 *
 * @example
 * ```typescript
 * const result = validateInvariantModel(myModel);
 * if (result.ok) {
 *   const registry = new InMemoryInvariantRegistry({ model: result.model! });
 * } else {
 *   console.error('Validation failed:', result.issues);
 * }
 * ```
 */
export function validateInvariantModel(input: unknown): InvariantModelValidationResult {
  const issues: InvariantModelIssue[] = [];

  // 1. Shape validation
  if (!input || typeof input !== 'object') {
    issues.push({
      code: 'INVALID_SHAPE',
      path: '$',
      message: 'Model must be an object',
    });
    return { ok: false, issues };
  }

  const obj = input as Record<string, unknown>;

  if (!Array.isArray(obj.primitives)) {
    issues.push({
      code: 'INVALID_SHAPE',
      path: '$.primitives',
      message: 'Model.primitives must be an array',
    });
  }

  if (!Array.isArray(obj.invariantSets)) {
    issues.push({
      code: 'INVALID_SHAPE',
      path: '$.invariantSets',
      message: 'Model.invariantSets must be an array',
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const primitives = obj.primitives as unknown[];
  const invariantSets = obj.invariantSets as unknown[];

  // 2. Validate primitives
  const primitiveIds = new Set<PrimitiveId>();

  for (let i = 0; i < primitives.length; i++) {
    const prim = primitives[i];
    const path = `primitives[${i}]`;

    if (!prim || typeof prim !== 'object') {
      issues.push({
        code: 'INVALID_PRIMITIVE',
        path,
        message: 'Primitive must be an object',
      });
      continue;
    }

    const p = prim as Record<string, unknown>;

    // Validate required string fields
    if (typeof p.id !== 'string' || p.id === '') {
      issues.push({
        code: 'INVALID_PRIMITIVE_FIELD',
        path: `${path}.id`,
        message: 'Primitive id must be a non-empty string',
      });
    }

    if (typeof p.name !== 'string' || p.name === '') {
      issues.push({
        code: 'INVALID_PRIMITIVE_FIELD',
        path: `${path}.name`,
        message: 'Primitive name must be a non-empty string',
      });
    }

    if (typeof p.description !== 'string' || p.description === '') {
      issues.push({
        code: 'INVALID_PRIMITIVE_FIELD',
        path: `${path}.description`,
        message: 'Primitive description must be a non-empty string',
      });
    }

    if (typeof p.category !== 'string' || p.category === '') {
      issues.push({
        code: 'INVALID_PRIMITIVE_FIELD',
        path: `${path}.category`,
        message: 'Primitive category must be a non-empty string',
      });
    }

    if (!Array.isArray(p.tags)) {
      issues.push({
        code: 'INVALID_PRIMITIVE_FIELD',
        path: `${path}.tags`,
        message: 'Primitive tags must be an array',
      });
    } else if (!p.tags.every((t) => typeof t === 'string')) {
      issues.push({
        code: 'INVALID_PRIMITIVE_FIELD',
        path: `${path}.tags`,
        message: 'Primitive tags must be an array of strings',
      });
    }

    // Check for duplicate IDs
    if (typeof p.id === 'string' && p.id !== '') {
      if (primitiveIds.has(p.id)) {
        issues.push({
          code: 'DUPLICATE_PRIMITIVE_ID',
          path: `${path}.id`,
          message: `Duplicate primitive ID: ${p.id}`,
        });
      } else {
        primitiveIds.add(p.id);
      }
    }
  }

  // 3. Validate invariant sets
  const setIds = new Set<InvariantSetId>();

  for (let i = 0; i < invariantSets.length; i++) {
    const set = invariantSets[i];
    const path = `invariantSets[${i}]`;

    if (!set || typeof set !== 'object') {
      issues.push({
        code: 'INVALID_INVARIANT_SET',
        path,
        message: 'Invariant set must be an object',
      });
      continue;
    }

    const s = set as Record<string, unknown>;

    // Validate set fields
    if (typeof s.id !== 'string' || s.id === '') {
      issues.push({
        code: 'INVALID_SET_FIELD',
        path: `${path}.id`,
        message: 'Set id must be a non-empty string',
      });
    }
if (typeof s.name !== 'string' || s.name === '') {
  issues.push({
    code: 'INVALID_SET_FIELD',
    path: `${path}.name`,
    message: 'Set name must be a non-empty string',
  });
}

if (typeof s.description !== 'string' || s.description === '') {
  issues.push({
    code: 'INVALID_SET_FIELD',
    path: `${path}.description`,
    message: 'Set description must be a non-empty string',
  });
}

if (typeof s.version !== 'string' || s.version === '') {
  issues.push({
    code: 'INVALID_SET_FIELD',
    path: `${path}.version`,
    message: 'Set version must be a non-empty string',
  });
}

// Check for duplicate set IDs
if (typeof s.id === 'string' && s.id !== '') {
  if (setIds.has(s.id)) {
    issues.push({
      code: 'DUPLICATE_INVARIANT_SET_ID',
      path: `${path}.id`,
      message: `Duplicate invariant set ID: ${s.id}`,
    });
  } else {
    setIds.add(s.id);
  }
}

// Validate rules
if (!Array.isArray(s.rules)) {
  issues.push({
    code: 'INVALID_SET_FIELD',
    path: `${path}.rules`,
    message: 'Set rules must be an array',
  });
  continue;
}

const ruleIds = new Set<InvariantRuleId>();

for (let j = 0; j < s.rules.length; j++) {
  const rule = s.rules[j];
  const rulePath = `${path}.rules[${j}]`;

  if (!rule || typeof rule !== 'object') {
    issues.push({
      code: 'INVALID_RULE',
      path: rulePath,
      message: 'Rule must be an object',
    });
    continue;
  }

  const r = rule as Record<string, unknown>;

  // Validate rule fields
  if (typeof r.id !== 'string' || r.id === '') {
    issues.push({
      code: 'INVALID_RULE_FIELD',
      path: `${rulePath}.id`,
      message: 'Rule id must be a non-empty string',
    });
  }

  if (typeof r.title !== 'string' || r.title === '') {
    issues.push({
      code: 'INVALID_RULE_FIELD',
      path: `${rulePath}.title`,
      message: 'Rule title must be a non-empty string',
    });
  }

  if (typeof r.shortStudentLabel !== 'string' || r.shortStudentLabel === '') {
    issues.push({
      code: 'INVALID_RULE_FIELD',
      path: `${rulePath}.shortStudentLabel`,
      message: 'Rule shortStudentLabel must be a non-empty string',
    });
  }

  if (typeof r.description !== 'string' || r.description === '') {
    issues.push({
      code: 'INVALID_RULE_FIELD',
      path: `${rulePath}.description`,
      message: 'Rule description must be a non-empty string',
    });
  }

  // Validate level
  if (!VALID_LEVELS.includes(r.level as InvariantRuleLevel)) {
    issues.push({
      code: 'INVALID_RULE_LEVEL',
      path: `${rulePath}.level`,
      message: `Rule level must be one of: ${VALID_LEVELS.join(', ')}`,
    });
  }

  if (!Array.isArray(r.tags)) {
    issues.push({
      code: 'INVALID_RULE_FIELD',
      path: `${rulePath}.tags`,
      message: 'Rule tags must be an array',
    });
  } else if (!r.tags.every((t) => typeof t === 'string')) {
    issues.push({
      code: 'INVALID_RULE_FIELD',
      path: `${rulePath}.tags`,
      message: 'Rule tags must be an array of strings',
    });
  }

  if (!Array.isArray(r.primitiveIds)) {
    issues.push({
      code: 'INVALID_RULE_FIELD',
      path: `${rulePath}.primitiveIds`,
      message: 'Rule primitiveIds must be an array',
    });
  } else {
    if (!r.primitiveIds.every((p) => typeof p === 'string')) {
      issues.push({
        code: 'INVALID_RULE_FIELD',
        path: `${rulePath}.primitiveIds`,
        message: 'Rule primitiveIds must be an array of strings',
      });
    }

    // 4. Check referential integrity
    for (let k = 0; k < r.primitiveIds.length; k++) {
      const primId = r.primitiveIds[k];
      if (typeof primId === 'string' && !primitiveIds.has(primId)) {
        issues.push({
          code: 'UNKNOWN_PRIMITIVE_ID',
          path: `${rulePath}.primitiveIds[${k}]`,
          message: `Unknown primitive ID: ${primId}`,
        });
      }
    }
  }

  // Check for duplicate rule IDs within set
  if (typeof r.id === 'string' && r.id !== '') {
    if (ruleIds.has(r.id)) {
      issues.push({
        code: 'DUPLICATE_RULE_ID_IN_SET',
        path: `${rulePath}.id`,
        message: `Duplicate rule ID in set: ${r.id}`,
      });
    } else {
      ruleIds.add(r.id);
    }
  }
}