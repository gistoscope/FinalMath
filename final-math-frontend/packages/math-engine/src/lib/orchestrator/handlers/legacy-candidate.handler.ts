/**
 * Legacy Candidate Handler
 *
 * Handles candidate generation using the legacy MapMaster system.
 * Applies locality filtering and operator anchoring.
 */

import { injectable } from 'tsyringe';

import { InvariantRegistry } from '../../invariants/InvariantRegistry';
import { MapMaster } from '../../mapmaster/MapMaster.js';
import { LocalityFilter } from '../filters/locality.filter.js';
import { OperatorAnchorFilter } from '../filters/operator-anchor.filter.js';

/**
 * Result of legacy candidate generation
 */
export interface LegacyCandidateResult {
  candidates: any[];
  resolvedSelectionPath?: string;
}

/**
 * LegacyCandidateHandler - Generates candidates using MapMaster
 */
@injectable()
export class LegacyCandidateHandler {
  private readonly log: (message: string) => void = console.log;

  constructor(
    private readonly mapMaster: MapMaster,
    private readonly localityFilter: LocalityFilter,
    private readonly operatorAnchorFilter: OperatorAnchorFilter,
  ) {}

  /**
   * Generate candidates using legacy MapMaster
   *
   * @param params - Generation parameters
   * @returns Candidates with resolved selection path
   */
  generate(params: {
    expressionLatex: string;
    selectionPath: string | null;
    operatorIndex: number | null | undefined;
    invariantSetIds: string[];
    registry: InvariantRegistry;
    ast: any;
    isPrimitiveMasterPath: boolean;
  }): LegacyCandidateResult {
    // Generate candidates via MapMaster
    const mapResult = this.mapMaster.generate({
      expressionLatex: params.expressionLatex,
      selectionPath: params.selectionPath,
      operatorIndex: params.operatorIndex ?? undefined,
      invariantSetIds: params.invariantSetIds,
      registry: params.registry,
    });

    this.log(
      `[LegacyCandidateHandler] MapMaster returned ${mapResult.candidates.length} candidates`,
    );

    let candidates = mapResult.candidates;

    // Apply locality filtering (only for legacy path)
    if (!params.isPrimitiveMasterPath) {
      const beforeLocality = candidates.length;
      candidates = this.localityFilter.apply(
        candidates,
        params.selectionPath,
        mapResult.resolvedSelectionPath,
      );
      const afterLocality = candidates.length;

      if (beforeLocality !== afterLocality) {
        this.log(
          `[LegacyCandidateHandler] Locality filtered candidates: ${beforeLocality} -> ${afterLocality}`,
        );
      }
    }

    // Apply operator anchoring (only for legacy path)
    if (!params.isPrimitiveMasterPath && params.ast) {
      const beforeAnchor = candidates.length;
      candidates = this.operatorAnchorFilter.apply(
        candidates,
        params.ast,
        params.selectionPath,
        params.operatorIndex,
        mapResult.resolvedSelectionPath,
      );
      const afterAnchor = candidates.length;

      if (beforeAnchor !== afterAnchor) {
        const anchorPath = this.getOperatorAnchorPathForLogging(
          params.ast,
          mapResult.resolvedSelectionPath,
          params.selectionPath,
          params.operatorIndex ?? undefined,
        );

        if (candidates.length > 0) {
          this.log(
            `[LegacyCandidateHandler] Operator anchored to "${anchorPath}": ${beforeAnchor} -> ${afterAnchor} candidates`,
          );
        } else {
          this.log(
            `[LegacyCandidateHandler] Operator anchor "${anchorPath}" matched no candidates, cleared all`,
          );
        }
      }
    }

    return {
      candidates,
      resolvedSelectionPath: mapResult.resolvedSelectionPath,
    };
  }

  /**
   * Get operator anchor path for logging purposes
   * (Duplicates logic from OperatorAnchorFilter for logging)
   */
  private getOperatorAnchorPathForLogging(
    ast: any,
    selectionAstPath: string | undefined,
    selectionPath: string | null,
    operatorIndex: number | undefined,
  ): string | null {
    // This is a simplified version for logging only
    // The actual filtering is done by OperatorAnchorFilter
    if (typeof operatorIndex === 'number' && selectionAstPath) {
      return selectionAstPath;
    }
    if (
      selectionPath &&
      (selectionPath.endsWith('.op') || selectionPath.includes('.op.'))
    ) {
      return selectionAstPath || null;
    }
    return null;
  }
}
