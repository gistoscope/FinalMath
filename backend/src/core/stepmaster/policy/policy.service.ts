import { injectable } from "tsyringe";

import { StepPolicyConfig } from "../step-master.types.js";
import { StepPolicyFactory } from "./policy.factory.js";

/**
 * Service to manage and retrieve active policies.
 * Currently delegates creation to the factory.
 */
@injectable()
export class StepPolicyService {
  constructor(private factory: StepPolicyFactory) {}

  getStudentPolicy(): StepPolicyConfig {
    return this.factory.createStudentPolicy();
  }

  getTeacherPolicy(): StepPolicyConfig {
    return this.factory.createTeacherPolicy();
  }

  createCustom(overrides: Partial<StepPolicyConfig>): StepPolicyConfig {
    return this.factory.createCustomPolicy(overrides);
  }
}
