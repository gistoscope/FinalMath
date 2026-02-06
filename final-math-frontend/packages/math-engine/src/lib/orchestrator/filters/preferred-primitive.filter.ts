/**
 * Preferred Primitive Filter
 *
 * Filters candidates to only those matching a preferred primitive ID.
 * CRITICAL for hint application - ensures the exact primitive is applied.
 */

import { injectable } from "tsyringe";

/**
 * Candidate interface (minimal definition for filtering)
 */
export interface Candidate {
  id: string;
  primitiveIds: string[];
  [key: string]: any;
}

/**
 * PreferredPrimitiveFilter - Filters candidates by preferred primitive ID
 */
@injectable()
export class PreferredPrimitiveFilter {
  private readonly log: (message: string) => void = console.log;

  /**
   * Apply preferred primitive filtering to candidates
   *
   * CRITICAL: If the caller provided a preferredPrimitiveId, we MUST only consider
   * candidates whose PRIMARY primitive matches it. Otherwise, the orchestrator
   * may apply a different "best" step, which breaks the intended explicit action.
   *
   * @param candidates - Array of candidates to filter
   * @param preferredPrimitiveId - The preferred primitive ID to match
   * @returns Filtered array of candidates matching the preferred primitive
   */
  apply(candidates: Candidate[], preferredPrimitiveId: string): Candidate[] {
    if (!preferredPrimitiveId) {
      return candidates;
    }

    const before = candidates.length;
    const filtered = candidates.filter((c) => {
      const prims = c.primitiveIds;
      // Match only if the PRIMARY primitive (first in array) matches
      return Array.isArray(prims) && prims.length > 0 && prims[0] === preferredPrimitiveId;
    });
    const after = filtered.length;

    this.log(
      `[PreferredPrimitiveFilter] preferredPrimitiveId="${preferredPrimitiveId}" filtered candidates: ${before} -> ${after}`
    );

    return filtered;
  }

  /**
   * Check if a single candidate matches the preferred primitive
   *
   * @param candidate - The candidate to check
   * @param preferredPrimitiveId - The preferred primitive ID
   * @returns true if the candidate's primary primitive matches
   */
  matches(candidate: Candidate, preferredPrimitiveId: string): boolean {
    const prims = candidate.primitiveIds;
    return Array.isArray(prims) && prims.length > 0 && prims[0] === preferredPrimitiveId;
  }
}
