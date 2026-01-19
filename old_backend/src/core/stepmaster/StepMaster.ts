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
import type { MapMasterCandidate } from "../mapmaster/mapmaster.types.js";
import type {
  StepHistorySnapshot,
  StepMasterInput,
  StepMasterResult,
} from "./stepmaster.types.js";

export interface StepMasterConfig {
  log?: (message: string) => void;
}

/**
 * StepMaster - Pure domain class for step decision making
 */
@injectable()
export class StepMaster {
  private readonly log: (message: string) => void = console.log;

  /**
   * Decide which step to take.
   *
   * Strategy:
   *  - Filter out candidates that are "repetitive" or "looping" based on history
   *  - Filter out candidates that do not match the actionTarget (Locality)
   *  - If no candidates remain -> "no-candidates"
   *  - Else -> pick the first one (simple student policy)
   */
  decide(input: StepMasterInput): StepMasterResult {
    const { candidates, history, policy, actionTarget } = input;
    this.log(
      `[StepMaster] Deciding among ${candidates.length} candidates. Last step exists: ${!!history.lastStep}`,
    );

    let validCandidates = candidates;

    // 1. Locality Filter (Cursor Dictatorship)
    if (actionTarget && policy.localityEnforcement) {
      this.log(`[StepMaster] Enforcing locality for target: ${actionTarget}`);
      validCandidates = validCandidates.filter((c) => {
        const match = c.targetPath === actionTarget;
        if (!match) {
          this.log(
            `[StepMaster] Candidate ${c.id} rejected: target ${c.targetPath} != ${actionTarget}`,
          );
        }
        return match;
      });
    }

    // 2. Filter out repetitive/looping steps
    if (!policy.allowRepetition) {
      validCandidates = validCandidates.filter((c) => {
        if (this.isCandidateRepetitive(c, history)) {
          this.log(`[StepMaster] Candidate ${c.id} rejected: repetitive`);
          return false;
        }
        return true;
      });
    }
    this.log(`[StepMaster] Valid candidates: ${validCandidates.length}`);

    if (validCandidates.length === 0) {
      return {
        input,
        decision: {
          status: "no-candidates",
          chosenCandidateId: null,
        },
        primitivesToApply: [],
      };
    }

    // 3. Prioritize (simple strategy: pick first)
    const best = validCandidates[0];
    this.log(`[StepMaster] Chosen: ${best.id}`);

    // Map primitive IDs to objects
    const primitivesToApply = best.primitiveIds.map((id: string) => ({ id }));

    return {
      input,
      decision: {
        status: "chosen",
        chosenCandidateId: best.id,
      },
      primitivesToApply,
    };
  }

  /**
   * Check if a candidate repeats the last step.
   */
  private isCandidateRepetitive(
    candidate: MapMasterCandidate,
    history: StepHistorySnapshot,
  ): boolean {
    if (!history.lastStep) return false;

    const lastStep = history.lastStep;

    // Check if we are trying to apply the same rule to the same path
    if (
      lastStep.invariantRuleId === candidate.invariantRuleId &&
      lastStep.targetPath === candidate.targetPath
    ) {
      return true;
    }

    return false;
  }
}

/**
 * Factory function for StepMaster (backward compatibility)
 */
export function createStepMaster(): StepMaster {
  return new StepMaster();
}
