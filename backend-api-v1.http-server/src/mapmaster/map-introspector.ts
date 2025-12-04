import { parseExpression, AstNode } from './ast';
import { mapMasterGenerate, MapMasterCandidate } from './mapmaster.core';
import { MapBuilder } from './map-builder';
import { SemanticMap } from './semantic-map.types';
import { InMemoryInvariantRegistry } from '../invariants/index';

export class MapIntrospectorService {

    /**
     * Строит семантическую карту для формулы
     */
    static introspect(
        latex: string,
        registry: InMemoryInvariantRegistry
    ): SemanticMap {

        // 1. Парсим формулу в AST
        const ast = parseExpression(latex);
        if (!ast) {
            throw new Error("Failed to parse latex");
        }

        // 2. Получаем кандидатов для ВСЕХ узлов
        // Since MapMaster is strict, we need to iterate over all nodes and ask for candidates for each.
        const candidates: MapMasterCandidate[] = [];
        const paths = this.getAllPaths(ast);

        // We assume a default invariant set for now, or we need to know which sets are active.
        // For introspection, maybe we use all available sets? Or a specific one?
        // The user request doesn't specify. Let's assume we use all sets in the registry?
        // Or maybe we just use the "default" set if we know it.
        // In HandlerPostEntryStep, it uses `req.invariantSetIds`.
        // For introspection, let's try to use all sets in the registry.
        const allSetIds = registry.getAllInvariantSets().map(s => s.id);

        for (const path of paths) {
            const result = mapMasterGenerate({
                expressionLatex: latex,
                selectionPath: path,
                invariantSetIds: allSetIds,
                registry: registry
            });
            candidates.push(...result.candidates);
        }

        // Deduplicate candidates if needed (though strict targeting should prevent overlap)
        // Actually, MapMaster might return candidates for parent context too.
        // If I select child, it might return parent candidate.
        // If I select parent, it returns parent candidate.
        // So I might get duplicates.
        const uniqueCandidates = this.deduplicateCandidates(candidates);

        // 3. Строим карту
        return MapBuilder.build(latex, ast, uniqueCandidates);
    }

    private static getAllPaths(ast: AstNode): string[] {
        const paths: string[] = [];

        function traverse(node: AstNode, path: string) {
            paths.push(path);

            if (node.type === 'binaryOp') {
                traverse(node.left, path === 'root' ? 'term[0]' : `${path}.term[0]`);
                traverse(node.right, path === 'root' ? 'term[1]' : `${path}.term[1]`);
            } else if (node.type === 'group') {
                traverse(node.content, path === 'root' ? 'content' : `${path}.content`);
            }
            // Mixed, Fraction, Integer, Variable are leaves in current AST structure for traversal purposes
        }

        traverse(ast, 'root');
        return paths;
    }

    private static deduplicateCandidates(candidates: MapMasterCandidate[]): MapMasterCandidate[] {
        const seen = new Set<string>();
        return candidates.filter(c => {
            const key = `${c.invariantRuleId}:${c.targetPath}:${c.primitiveIds.join(',')}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
}
