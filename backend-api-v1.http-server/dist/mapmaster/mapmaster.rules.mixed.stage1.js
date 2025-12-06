/**
 * MapMaster Rules: Mixed (Stage 1)
 *
 * Implements candidate generation for mixed number operations
 * (e.g. integer + fraction).
 */
import { filterRulesByDomain } from './mapmaster.rules.common';
/**
 * Build candidates for Stage-1 mixed rules.
 */
export function buildCandidatesForMixedStage1(ctx) {
    const { invariantRules, windowRootPath } = ctx;
    const candidates = [];
    // Filter for relevant rules
    const mixedRules = filterRulesByDomain(invariantRules, 'Mixed');
    for (const rule of mixedRules) {
        for (const primId of rule.primitiveIds) {
            candidates.push({
                id: `cand-${candidates.length + 1}`,
                invariantRuleId: rule.id,
                primitiveIds: [primId],
                targetPath: windowRootPath.join('.'),
                description: rule.description || rule.title,
            });
        }
    }
    return candidates;
}
