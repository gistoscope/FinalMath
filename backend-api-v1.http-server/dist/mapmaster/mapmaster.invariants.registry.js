/**
 * MapMaster Invariants Registry (Local)
 *
 * Defines the pattern metadata for Stage-1 invariants.
 * This serves as a local extension to the core InMemoryInvariantRegistry,
 * allowing us to use pattern-based filtering logic from CLOD.
 */
/**
 * Stage-1 Fraction Invariants
 */
export const FRACTIONS_SAME_DEN_STAGE1 = {
    id: 'fractions-same-den-stage1',
    rules: [
        {
            id: 'FRAC_ADD_SAME_DEN_STAGE1',
            stage: 'Stage1',
            domain: 'FractionsSameDen',
            operation: 'Add',
            pattern: {
                operator: '+',
                requiresFractions: true,
                requireSameDenominator: true
            }
        },
        {
            id: 'FRAC_SUB_SAME_DEN_STAGE1',
            stage: 'Stage1',
            domain: 'FractionsSameDen',
            operation: 'Sub',
            pattern: {
                operator: '-',
                requiresFractions: true,
                requireSameDenominator: true
            }
        }
    ]
};
/**
 * Stage-1 Integer Invariants
 */
export const INTEGERS_STAGE1 = {
    id: 'integers-stage1',
    rules: [
        {
            id: 'INT_ADD_STAGE1',
            stage: 'Stage1',
            domain: 'Integers',
            operation: 'Add',
            pattern: {
                operator: '+',
                requiresIntegers: true
            }
        },
        {
            id: 'INT_SUB_STAGE1',
            stage: 'Stage1',
            domain: 'Integers',
            operation: 'Sub',
            pattern: {
                operator: '-',
                requiresIntegers: true
            }
        },
        {
            id: 'INT_MUL_STAGE1',
            stage: 'Stage1',
            domain: 'Integers',
            operation: 'Mul',
            pattern: {
                operator: '*',
                requiresIntegers: true
            }
        },
        {
            id: 'INT_DIV_STAGE1',
            stage: 'Stage1',
            domain: 'Integers',
            operation: 'Div',
            pattern: {
                operator: '/',
                requiresIntegers: true
            }
        }
    ]
};
/**
 * Stage-1 Mixed Invariants
 */
export const MIXED_STAGE1 = {
    id: 'mixed-stage1',
    rules: [
        {
            id: 'MIXED_INT_TO_FRAC_STAGE1',
            stage: 'Stage1',
            domain: 'Mixed',
            operation: 'Convert',
            pattern: {
                requiresIntegers: true,
                allowsMixed: true
            }
        },
        {
            id: 'MIXED_ADD_INT_FRAC_STAGE1',
            stage: 'Stage1',
            domain: 'Mixed',
            operation: 'Add',
            pattern: {
                operator: '+',
                allowsMixed: true
            }
        }
    ]
};
/**
 * Registry of all Stage-1 invariant sets.
 */
export const STAGE1_INVARIANT_SETS = [
    FRACTIONS_SAME_DEN_STAGE1,
    INTEGERS_STAGE1,
    MIXED_STAGE1
];
/**
 * Helper to find pattern for a rule ID.
 */
export function findPatternForRule(ruleId) {
    for (const set of STAGE1_INVARIANT_SETS) {
        const rule = set.rules.find(r => r.id === ruleId);
        if (rule)
            return rule.pattern;
    }
    return undefined;
}
/**
 * Helper to find domain for a rule ID.
 */
export function findDomainForRule(ruleId) {
    for (const set of STAGE1_INVARIANT_SETS) {
        const rule = set.rules.find(r => r.id === ruleId);
        if (rule)
            return rule.domain;
    }
    return undefined;
}
