import { injectable } from "tsyringe";
import { MapMasterCandidate } from "../../mapmaster/mapmaster.types.js";
import { ICandidateSelector } from "../interfaces/step-selector.interface.js";

/**
 * Simple selector that picks the first available candidate.
 * This represents the "dumb student" strategy or simply "taking the first valid path".
 */
@injectable()
export class SimpleSelector implements ICandidateSelector {
  select(candidates: MapMasterCandidate[]): MapMasterCandidate | null {
    if (candidates.length === 0) {
      return null;
    }
    // Simple strategy: pick the first one
    return candidates[0];
  }
}
