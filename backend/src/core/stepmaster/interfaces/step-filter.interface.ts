import { MapMasterCandidate } from "../../mapmaster/mapmaster.types.js";
import { StepMasterInput } from "../step-master.types.js";

export interface ICandidateFilter {
  /**
   * Filter the list of candidates based on specific criteria.
   * @param candidates List of available candidates
   * @param input Full context of the decision (history, policy, etc.)
   * @returns Filtered list of candidates
   */
  filter(candidates: MapMasterCandidate[], input: StepMasterInput): MapMasterCandidate[];
}
