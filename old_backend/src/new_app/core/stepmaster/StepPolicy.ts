/**
 * StepPolicy Class
 *
 * Defines step execution policies.
 */

import type { StepPolicyConfig } from "./stepmaster.types.js";

/**
 * StepPolicy - Factory for creating step policies
 */
export class StepPolicy {
  /**
   * Create the default student policy.
   */
  static createStudentPolicy(): StepPolicyConfig {
    return {
      name: "student-default",
      allowRepetition: false,
      maxHistoryDepth: 50,
      localityEnforcement: true,
    };
  }

  /**
   * Create a teacher policy (more permissive).
   */
  static createTeacherPolicy(): StepPolicyConfig {
    return {
      name: "teacher-default",
      allowRepetition: true,
      maxHistoryDepth: 100,
      localityEnforcement: false,
    };
  }

  /**
   * Create a custom policy.
   */
  static createCustomPolicy(
    overrides: Partial<StepPolicyConfig>,
  ): StepPolicyConfig {
    return {
      name: "custom",
      allowRepetition: false,
      maxHistoryDepth: 50,
      localityEnforcement: true,
      ...overrides,
    };
  }
}

/**
 * Backward compatibility function
 */
export function createDefaultStudentPolicy(): StepPolicyConfig {
  return StepPolicy.createStudentPolicy();
}
