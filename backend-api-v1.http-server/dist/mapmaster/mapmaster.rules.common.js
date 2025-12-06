/**
 * MapMaster Rules Common
 *
 * Shared types and utilities for rule modules.
 */
/**
 * Helper to filter rules by domain.
 */
export function filterRulesByDomain(rules, domain) {
    return rules.filter(r => r.domain === domain);
}
/**
 * Helper to filter rules by operation.
 */
export function filterRulesByOperation(rules, operation) {
    return rules.filter(r => r.operation === operation);
}
