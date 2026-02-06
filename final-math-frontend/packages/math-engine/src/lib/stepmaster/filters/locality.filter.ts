import { injectable } from "tsyringe";
import { MapMasterCandidate } from "../../mapmaster/mapmaster.types.js";
import { ICandidateFilter } from "../interfaces/step-filter.interface.js";
import { StepMasterInput } from "../step-master.types.js";

/**
 * Filter candidates based on cursor locality (Dictatorship).
 * Only allows candidates that operate exactly on the actionTarget.
 */
@injectable()
export class LocalityFilter implements ICandidateFilter {
  filter(candidates: MapMasterCandidate[], input: StepMasterInput): MapMasterCandidate[] {
    const { actionTarget, policy } = input;

    // If policy disabled or no target specified, bypass filter
    if (!policy.localityEnforcement || !actionTarget) {
      return candidates;
    }

    console.log(`[LocalityFilter] Enforcing locality for target: ${actionTarget}`);

    return candidates.filter((c) => {
      const match = c.targetPath === actionTarget;
      if (!match) {
        // Logging rejected candidates for debugging purposes
        // In production, this might be too verbose
        // console.log(`[LocalityFilter] Candidate ${c.id} rejected: target ${c.targetPath} != ${actionTarget}`);
      }
      return match;
    });
  }
}
