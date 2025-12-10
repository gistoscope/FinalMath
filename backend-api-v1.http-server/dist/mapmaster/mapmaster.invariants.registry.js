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
            id: 'R.FRAC_ADD_SAME',
            stage: 'Stage1',
            domain: 'FractionsSameDen',
            operation: 'Add',
            pattern: {
                operator: '+',
                requiresFractions: true,
                requireSameDenominator: true
            },
            primitiveIds: ['P.FRAC_ADD_SAME_DEN']
        },
        {
            id: 'R.FRAC_SUB_SAME',
            stage: 'Stage1',
            domain: 'FractionsSameDen',
            operation: 'Sub',
            pattern: {
                operator: '-',
                requiresFractions: true,
                requireSameDenominator: true
            },
        },
        // NEW: Equivalent fraction expansion
        {
            id: 'R.FRAC_EQUIV',
            stage: 'Stage1',
            domain: 'FractionsSameDen',
            operation: 'Equiv',
            pattern: {
                operator: undefined, // applies to fraction node itself
                requiresFractions: true
            },
            primitiveIds: ['P.FRAC_EQUIV']
        }
    ]
};
/**
 * Stage-1 Generic Fraction Invariants (Mul/Div)
 */
export const FRACTIONS_GENERIC_STAGE1 = {
    id: 'fractions-generic-stage1',
    rules: [
        {
            id: 'R.FRAC_MUL',
            stage: 'Stage1',
            domain: 'Fractions',
            operation: 'Mul',
            pattern: {
                operator: '*',
                requiresFractions: true,
                requireSameDenominator: false
            },
            primitiveIds: ['P.FRAC_MUL']
        },
        {
            id: 'R.FRAC_DIV',
            stage: 'Stage1',
            domain: 'Fractions',
            operation: 'Div',
            pattern: {
                operator: '/',
                requiresFractions: true,
                requireSameDenominator: false
            },
            primitiveIds: ['P.FRAC_DIV']
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
            id: 'R.INT_ADD',
            stage: 'Stage1',
            domain: 'Integers',
            operation: 'Add',
            pattern: {
                operator: '+',
                requiresIntegers: true
            },
            primitiveIds: ['P.INT_ADD']
        },
        {
            id: 'R.INT_SUB',
            stage: 'Stage1',
            domain: 'Integers',
            operation: 'Sub',
            pattern: {
                operator: '-',
                requiresIntegers: true
            },
            primitiveIds: ['P.INT_SUB']
        },
        {
            id: 'R.INT_MUL',
            stage: 'Stage1',
            domain: 'Integers',
            operation: 'Mul',
            pattern: {
                operator: '*',
                requiresIntegers: true
            },
            primitiveIds: ['P.INT_MUL']
        },
        {
            id: 'R.INT_DIV_EXACT',
            stage: 'Stage1',
            domain: 'Integers',
            operation: 'Div',
            pattern: {
                operator: '/',
                requiresIntegers: true
            },
        },
        // NEW: Integer to Fraction
        {
            id: 'R.INT_TO_FRAC',
            stage: 'Stage1',
            domain: 'Integers',
            operation: 'Normalize',
            pattern: {
                requiresIntegers: true
            },
            primitiveIds: ['P.INT_TO_FRAC']
        }
    ]
};
/**
 * Stage-1 Mixed Invariants
 */
export const MIXED_STAGE1 = {
    id: 'mixed-stage1',
    rules: [
        // R.INT_PLUS_FRAC and R.INT_MINUS_FRAC are in Default Set
        {
            id: 'R.INT_PLUS_FRAC',
            stage: 'Stage1',
            domain: 'Mixed',
            operation: 'Add',
            pattern: {
                operator: '+',
                allowsMixed: true
            },
            primitiveIds: ['P.INT_PLUS_FRAC']
        },
        {
            id: 'R.INT_MINUS_FRAC',
            stage: 'Stage1',
            domain: 'Mixed',
            operation: 'Sub',
            pattern: {
                operator: '-',
                allowsMixed: true
            },
            primitiveIds: ['P.INT_MINUS_FRAC']
        }
    ]
};
/**
 * Registry of all Stage-1 invariant sets.
 */
export const STAGE1_INVARIANT_SETS = [
    FRACTIONS_SAME_DEN_STAGE1,
    FRACTIONS_GENERIC_STAGE1,
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
