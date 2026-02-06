import { injectable } from "tsyringe";
import { StepPolicyConfig } from "../step-master.types.js";

@injectable()
export class StepPolicyFactory {
  createStudentPolicy(): StepPolicyConfig {
    return {
      name: "student-default",
      allowRepetition: false,
      maxHistoryDepth: 50,
      localityEnforcement: true,
    };
  }

  createTeacherPolicy(): StepPolicyConfig {
    return {
      name: "teacher-default",
      allowRepetition: true,
      maxHistoryDepth: 100,
      localityEnforcement: false,
    };
  }

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
