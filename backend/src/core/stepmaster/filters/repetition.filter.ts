import { injectable } from "tsyringe";
import { MapMasterCandidate } from "../../mapmaster/mapmaster.types.js";
import { ICandidateFilter } from "../interfaces/step-filter.interface.js";
import { StepHistorySnapshot, StepMasterInput } from "../step-master.types.js";

/**
 * Filter candidates that are repetitive or induce loops.
 * Based on simple heuristic: don't apply same rule to same target immediately.
 */
@injectable()
export class RepetitionFilter implements ICandidateFilter {
  filter(candidates: MapMasterCandidate[], input: StepMasterInput): MapMasterCandidate[] {
    const { history, policy } = input;

    if (policy.allowRepetition) {
      return candidates;
    }

    return candidates.filter((c) => {
      if (this.isCandidateRepetitive(c, history)) {
        console.log(`[RepetitionFilter] Candidate ${c.id} rejected: repetitive`);
        return false;
      }
      return true;
    });
  }

  private isCandidateRepetitive(
    candidate: MapMasterCandidate,
    history: StepHistorySnapshot
  ): boolean {
    if (!history.lastStep) {
      return false;
    }

    const lastStep = history.lastStep;

    // Check if we are trying to apply the same rule to the same path
    if (
      lastStep.invariantRuleId === candidate.invariantRuleId &&
      lastStep.targetPath === candidate.targetPath
    ) {
      // For V5 primitives (all share "v5-rule"), also compare primitive IDs
      // to avoid false positives. Different primitives on the same target path
      // are NOT repetitive (e.g. P.NEG_DISTRIBUTE_ADD → P.FRAC_ADD_DIFF_DEN_MUL1).
      if (lastStep.primitiveIds && candidate.primitiveIds) {
        const lastPrimId = lastStep.primitiveIds[0];
        const candPrimId = candidate.primitiveIds[0];
        if (lastPrimId && candPrimId && lastPrimId !== candPrimId) {
          return false; // Different primitive → not repetitive
        }
      }
      return true;
    }

    return false;
  }
}
