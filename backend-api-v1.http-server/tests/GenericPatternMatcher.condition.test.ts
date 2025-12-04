import { describe, it, expect } from 'vitest';
import { GenericPatternMatcher } from '../src/mapmaster/GenericPatternMatcher';
import { parseExpression } from '../src/mapmaster/ast';

describe('GenericPatternMatcher Conditions', () => {
    it('should match without condition', () => {
        const matcher = new GenericPatternMatcher('a/b + c/d');
        const ast = parseExpression('1/2 + 3/2');
        const bindings = matcher.matches(ast!);

        expect(bindings).not.toBeNull();
        expect((bindings!['b'] as any).value).toBe('2');
        expect((bindings!['d'] as any).value).toBe('2');
    });

    it('should FAIL when condition b != d is not met (same denominators)', () => {
        const matcher = new GenericPatternMatcher('a/b + c/d');
        const ast = parseExpression('1/2 + 3/2');

        // We need to manually check the condition for now, as it's not integrated into matches() yet
        // But the goal is to have a method checkCondition(bindings, condition)
        const bindings = matcher.matches(ast!);
        expect(bindings).not.toBeNull();

        const conditionMet = matcher.checkCondition(bindings!, 'b != d');
        expect(conditionMet).toBe(false);
    });

    it('should PASS when condition b != d IS met (diff denominators)', () => {
        const matcher = new GenericPatternMatcher('a/b + c/d');
        const ast = parseExpression('1/2 + 3/4');

        const bindings = matcher.matches(ast!);
        expect(bindings).not.toBeNull();

        const conditionMet = matcher.checkCondition(bindings!, 'b != d');
        expect(conditionMet).toBe(true);
    });

    it('should handle complex expressions in condition', () => {
        const matcher = new GenericPatternMatcher('a/b + c/d');
        const ast = parseExpression('1/(x+1) + 3/(x+1)');

        const bindings = matcher.matches(ast!);
        expect(bindings).not.toBeNull();

        // (x+1) == (x+1), so b != d should be false
        const conditionMet = matcher.checkCondition(bindings!, 'b != d');
        expect(conditionMet).toBe(false);
    });
});
