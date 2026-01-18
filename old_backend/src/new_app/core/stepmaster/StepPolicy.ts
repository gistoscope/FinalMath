/**
 * StepPolicy Class
 *
 * Defines step execution policies.
 */

import { container, injectable } from "tsyringe";
import type { StepPolicyConfig } from "./stepmaster.types.js";

/**
 * StepPolicy - Factory for creating step policies
 */
@injectable()
export class StepPolicy {
  /**
   * Create the default student policy.
   */
  createStudentPolicy(): StepPolicyConfig {
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
  createTeacherPolicy(): StepPolicyConfig {
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
  createCustomPolicy(overrides: Partial<StepPolicyConfig>): StepPolicyConfig {
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
  const stepPolicy = container.resolve(StepPolicy);
  return stepPolicy.createStudentPolicy();
}
