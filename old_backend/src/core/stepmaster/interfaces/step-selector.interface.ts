import { MapMasterCandidate } from "../../mapmaster/mapmaster.types.js";

export interface ICandidateSelector {
  /**
   * Select a single candidate from the list of valid candidates.
   * @param candidates Filtered list of candidates
   * @returns The chosen candidate, or null if none are suitable/available
   */
  select(candidates: MapMasterCandidate[]): MapMasterCandidate | null;
}
