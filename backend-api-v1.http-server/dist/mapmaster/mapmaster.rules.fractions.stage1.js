/**
 * MapMaster Rules: Fractions (Stage 1)
 *
 * Implements candidate generation for basic fraction operations
 * with the same denominator.
 */
import { filterRulesByDomain } from './mapmaster.rules.common';
/**
 * Build candidates for Stage-1 fraction rules.
 */
export function buildCandidatesForFractionsStage1(ctx) {
    const { invariantRules, windowRootPath } = ctx;
    const candidates = [];
    // Filter for relevant rules
    const fractionRules = filterRulesByDomain(invariantRules, 'FractionsSameDen');
    for (const rule of fractionRules) {
        // In Stage 1, we map directly to primitives
        // The rule ID itself might be the primitive ID or mapped
        // CLOD implementation logic:
        // Create a candidate for each primitive ID in the rule
        for (const primId of rule.primitiveIds) {
            candidates.push({
                id: `cand-${candidates.length + 1}`, // Simple ID generation
                invariantRuleId: rule.id,
                primitiveIds: [primId], // MapMasterCandidate expects array
                targetPath: windowRootPath.join('.'), // Convert AstPath array to string path
                description: rule.description || rule.title,
            });
        }
    }
    return candidates;
}
