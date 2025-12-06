/**
 * MapMaster Rules: Integers (Stage 1)
 *
 * Implements candidate generation for basic integer operations.
 */
import { filterRulesByDomain } from './mapmaster.rules.common';
/**
 * Build candidates for Stage-1 integer rules.
 */
export function buildCandidatesForIntegersStage1(ctx) {
    const { invariantRules, windowRootPath } = ctx;
    const candidates = [];
    // Filter for relevant rules
    const integerRules = filterRulesByDomain(invariantRules, 'Integers');
    for (const rule of integerRules) {
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
