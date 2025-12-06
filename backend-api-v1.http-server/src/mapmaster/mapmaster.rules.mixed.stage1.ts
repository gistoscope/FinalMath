/**
 * MapMaster Rules: Mixed (Stage 1)
 * 
 * Implements candidate generation for mixed number operations
 * (e.g. integer + fraction).
 */

import type { MapMasterCandidate, MapMasterCandidateId } from './mapmaster.core';
import type { RuleContext } from './mapmaster.rules.common';
import { filterRulesByDomain } from './mapmaster.rules.common';

/**
 * Build candidates for Stage-1 mixed rules.
 */
export function buildCandidatesForMixedStage1(ctx: RuleContext): MapMasterCandidate[] {
    const { invariantRules, windowRootPath } = ctx;
    const candidates: MapMasterCandidate[] = [];

    // Filter for relevant rules
    const mixedRules = filterRulesByDomain(invariantRules, 'Mixed');

    for (const rule of mixedRules) {
        for (const primId of rule.primitiveIds) {
            candidates.push({
                id: `cand-${candidates.length + 1}` as MapMasterCandidateId,
                invariantRuleId: rule.id,
                primitiveIds: [primId],
                targetPath: windowRootPath.join('.'),
                description: rule.description || rule.title,
            });
        }
    }

    return candidates;
}
