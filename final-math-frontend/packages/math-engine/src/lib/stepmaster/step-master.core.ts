/**
 * StepMaster Class
 *
 * Given a list of candidates, history, and policy, decide which step to take.
 *
 * Responsibilities:
 *  - Filter out repetitive/looping steps based on history
 *  - Enforce locality (action target matching)
 *  - Select the best candidate based on policy
 */

import { injectable } from "tsyringe";
import { StepMasterFactory } from "./step-master.factory.js";
import type { StepMasterInput, StepMasterResult } from "./step-master.types.js";

export interface StepMasterConfig {
  log?: (message: string) => void;
}

/**
 * StepMaster - Legacy wrapper around the modular Orchestrator
 * This ensures backward compatibility for existing code.
 */
@injectable()
export class StepMaster {
  constructor(private readonly factory: StepMasterFactory) {}

  /**
   * Decide which step to take.
   * Delegates the actual logic to the StepMasterOrchestrator created by the factory.
   */
  decide(input: StepMasterInput): StepMasterResult {
    // Create the orchestrator (or fetching a singleton/cached instance if optimized)
    const orchestrator = this.factory.create();

    // Delegate execution
    return orchestrator.decide(input);
  }
}
