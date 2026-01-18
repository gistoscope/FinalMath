/**
 * MapMaster Class
 *
 * Generates step candidates based on expression state and invariant rules.
 *
 * Responsibilities:
 *  - Parse expression into AST
 *  - Normalize selection
 *  - Match invariant rules to expression patterns
 *  - Generate candidate list
 */

import { injectable } from "tsyringe";
import type {
  MapMasterCandidate,
  MapMasterCandidateId,
  MapMasterInput,
  MapMasterResult,
} from "./mapmaster.types.js";

export interface MapMasterConfig {
  log?: (message: string) => void;
  warn?: (message: string) => void;
}

/**
 * MapMaster - Generates step candidates
 */
@injectable()
export class MapMaster {
  private readonly log: (message: string) => void = console.log;
  private readonly warn: (message: string) => void = console.warn;

  /**
   * Generate step candidates based on the input.
   *
   * Uses the modular MapMaster pipeline:
   * 1. Parse AST
   * 2. Normalize Selection
   * 3. Resolve Semantic Window
   * 4. Query Invariants
   * 5. Generate Candidates via Rules
   */
  generate(input: MapMasterInput): MapMasterResult {
    const { expressionLatex, registry, invariantSetIds, selectionPath } = input;

    this.log(`[MapMaster] Generating candidates for: ${expressionLatex}`);

    // Get applicable invariant sets
    const candidateSets = invariantSetIds
      .map((id) => registry.getInvariantSetById(id))
      .filter((set) => set !== undefined);

    if (candidateSets.length === 0) {
      this.warn("[MapMaster] No valid invariant sets found");
      return { candidates: [] };
    }

    // Collect all rules from the sets
    const allRules = candidateSets.flatMap((set) => set!.rules);

    // For now, generate a basic candidate for each rule
    // In a full implementation, this would include pattern matching
    const candidates: MapMasterCandidate[] = allRules.map((rule, index) => ({
      id: `candidate-${rule.id}-${index}` as MapMasterCandidateId,
      invariantRuleId: rule.id,
      primitiveIds: rule.primitiveIds,
      targetPath: selectionPath || "root",
      description: rule.shortStudentLabel,
      category: "direct" as const,
    }));

    this.log(`[MapMaster] Generated ${candidates.length} candidates`);

    return {
      candidates,
      resolvedSelectionPath: selectionPath || undefined,
    };
  }
}

/**
 * Factory function for MapMaster (backward compatibility)
 */
export function createMapMaster(): MapMaster {
  return new MapMaster();
}

/**
 * Standalone function for backward compatibility
 */
export function mapMasterGenerate(input: MapMasterInput): MapMasterResult {
  const mapMaster = new MapMaster();
  return mapMaster.generate(input);
}
