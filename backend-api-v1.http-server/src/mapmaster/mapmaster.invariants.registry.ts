/**
 * MapMaster Invariants Registry (Local)
 * 
 * Defines the pattern metadata for Stage-1 invariants.
 * This serves as a local extension to the core InMemoryInvariantRegistry,
 * allowing us to use pattern-based filtering logic from CLOD.
 */

/**
 * Pattern specification for an invariant rule.
 * Used to determine when a rule is applicable to an AST node.
 */
export interface InvariantPattern {
    /**
     * The operator this rule applies to (e.g., "+", "-", "*", "/").
     */
    operator?: string;

    /**
     * Whether this rule requires operands to be fractions.
     */
    requiresFractions?: boolean;

    /**
     * Whether this rule requires fractions to have the same denominator.
     */
    requireSameDenominator?: boolean;

    /**
     * Whether this rule requires operands to be integers.
     */
    requiresIntegers?: boolean;

    /**
     * Whether this rule applies to mixed numbers (integer + fraction).
     */
    allowsMixed?: boolean;

    /**
     * Additional custom constraints.
     */
    custom?: Record<string, any>;
}

/**
 * Local definition of an invariant rule with pattern metadata.
 */
export interface LocalInvariantRule {
    id: string;
    stage: string;
    domain: string;
    operation?: string;
    pattern?: InvariantPattern;
    primitiveIds?: string[];
}

/**
 * A collection of related invariant rules (local definition).
 */
export interface LocalInvariantSet {
    id: string;
    rules: LocalInvariantRule[];
}

/**
 * Stage-1 Fraction Invariants
 */
export const FRACTIONS_SAME_DEN_STAGE1: LocalInvariantSet = {
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
            },
            primitiveIds: ['P.FRAC_ADD_SAME_DEN']
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
            },
            primitiveIds: ['P.FRAC_SUB_SAME_DEN']
        }
    ]
};

/**
 * Stage-1 Integer Invariants
 */
export const INTEGERS_STAGE1: LocalInvariantSet = {
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
            },
            primitiveIds: ['P.INT_ADD']
        },
        {
            id: 'INT_SUB_STAGE1',
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
            id: 'INT_MUL_STAGE1',
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
            id: 'INT_DIV_STAGE1',
            stage: 'Stage1',
            domain: 'Integers',
            operation: 'Div',
            pattern: {
                operator: '/',
                requiresIntegers: true
            },
            primitiveIds: ['P.INT_DIV_EXACT']
        }
    ]
};

/**
 * Stage-1 Mixed Invariants
 */
export const MIXED_STAGE1: LocalInvariantSet = {
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
            },
            primitiveIds: ['P.MIXED_SPLIT']
        },
        {
            id: 'MIXED_ADD_INT_FRAC_STAGE1',
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
            id: 'MIXED_SUB_INT_FRAC_STAGE1',
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
export const STAGE1_INVARIANT_SETS: LocalInvariantSet[] = [
    FRACTIONS_SAME_DEN_STAGE1,
    INTEGERS_STAGE1,
    MIXED_STAGE1
];

/**
 * Helper to find pattern for a rule ID.
 */
export function findPatternForRule(ruleId: string): InvariantPattern | undefined {
    for (const set of STAGE1_INVARIANT_SETS) {
        const rule = set.rules.find(r => r.id === ruleId);
        if (rule) return rule.pattern;
    }
    return undefined;
}

/**
 * Helper to find domain for a rule ID.
 */
export function findDomainForRule(ruleId: string): string | undefined {
    for (const set of STAGE1_INVARIANT_SETS) {
        const rule = set.rules.find(r => r.id === ruleId);
        if (rule) return rule.domain;
    }
    return undefined;
}
