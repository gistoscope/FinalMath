import { describe, it, expect } from 'vitest';
import { MapBuilder } from '../src/mapmaster/map-builder';
import { StepMasterMapAdapter } from '../src/stepmaster/stepmaster-map.adapter';
import { parseExpression } from '../src/mapmaster/ast';
import { MapMasterCandidate } from '../src/mapmaster/mapmaster.core';

describe('StepMaster Path Mismatch Fix', () => {
    it('should resolve op-1 to the addition node in 6/2 + 12/2', () => {
        const latex = '\\frac{6}{2} + \\frac{12}{2}';
        const ast = parseExpression(latex);
        expect(ast).toBeDefined();

        // Mock candidates (we just need them to be attached to the node)
        const candidates: MapMasterCandidate[] = [
            {
                id: 'cand-1' as any,
                invariantRuleId: 'P.FRAC_ADD_SAME',
                primitiveIds: ['P.FRAC_ADD_SAME'],
                targetPath: 'root', // + is root
                description: 'Add fractions',
                priority: 10
            }
        ];

        const map = MapBuilder.build(latex, ast!, candidates);

        // Verify sourceIds
        // 6/2 (Left) -> op-0
        // + (Root) -> op-1
        // 12/2 (Right) -> op-2

        const rootNode = map.nodes.find(n => n.path === 'root');
        expect(rootNode).toBeDefined();
        expect(rootNode!.sourceId).toBe('op-1');

        // Test Adapter with op-1
        const actions = StepMasterMapAdapter.getActionsForSelection({
            map,
            selectionPath: 'op-1'
        });

        expect(actions.length).toBeGreaterThan(0);
        expect(actions[0].invariantId).toBe('P.FRAC_ADD_SAME');
    });

    it('should resolve op-0 to the left fraction', () => {
        const latex = '\\frac{6}{2} + \\frac{12}{2}';
        const ast = parseExpression(latex);
        const map = MapBuilder.build(latex, ast!, []);

        const leftNode = map.nodes.find(n => n.path === 'term[0]');
        expect(leftNode).toBeDefined();
        expect(leftNode!.sourceId).toBe('op-0');
    });
});
