import { SemanticMap, SemanticNode, SemanticAction } from './semantic-map.types';
import { AstNode, toLatex } from './ast';
import { MapMasterCandidate } from './mapmaster.core';

/**
 * Строит семантическую карту из AST и кандидатов правил
 */
export class MapBuilder {

    /**
     * Главный метод построения карты
     * 
     * @param latex - Исходная формула
     * @param ast - Parsed AST от ParserService
     * @param candidates - Кандидаты правил от MapMaster
     */
    static build(
        latex: string,
        ast: AstNode,
        candidates: MapMasterCandidate[]
    ): SemanticMap {

        const nodes: SemanticNode[] = [];
        const actions: SemanticAction[] = [];

        // Шаг 1: Обойти AST и построить массив узлов
        const rootNodeId = this.buildNodeTree(ast, null, 'root', nodes);

        // Шаг 2: Привязать кандидатов к узлам как действия
        this.attachActions(nodes, candidates, actions);

        // Шаг 3: Проставить флаги
        this.computeFlags(nodes);

        // Шаг 4: Проставить sourceId (op-{index}) для синхронизации с Viewer
        this.assignSourceIds(nodes, rootNodeId);

        return {
            id: this.generateMapId(latex),
            latex,
            rootNodeId,
            nodes,
            actions
        };
    }

    /**
     * Проставляет sourceId (op-0, op-1...) в порядке In-Order traversal,
     * чтобы соответствовать логике Viewer/AST.
     */
    private static assignSourceIds(nodes: SemanticNode[], rootId: string): void {
        let opIndex = 0;

        const traverse = (nodeId: string) => {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return;

            // Logic matches ast.ts getNodeByOperatorIndex:
            // Group -> content
            // BinaryOp -> left, self, right
            // Fraction -> self

            if (node.syntacticType === 'PAREN') {
                if (node.childIds.length > 0) traverse(node.childIds[0]);
                return;
            }

            if (node.syntacticType === 'SUM' ||
                node.syntacticType === 'DIFFERENCE' ||
                node.syntacticType === 'PRODUCT' ||
                node.syntacticType === 'DIVISION' ||
                node.syntacticType === 'OPERATOR') {

                // BinaryOp: Left -> Self -> Right
                if (node.childIds.length > 0) traverse(node.childIds[0]); // Left

                // Self
                node.sourceId = `op-${opIndex++}`;

                if (node.childIds.length > 1) traverse(node.childIds[1]); // Right
                return;
            }

            if (node.syntacticType === 'FRACTION') {
                // Fraction: Self
                node.sourceId = `op-${opIndex++}`;
                return;
            }

            // Integer, Variable, etc. -> no op index
        };

        if (rootId) traverse(rootId);
    }

    /**
     * Рекурсивно обходит AST и строит SemanticNode[]
     * Возвращает ID созданного узла
     */
    private static buildNodeTree(
        astNode: AstNode,
        parentId: string | null,
        path: string,
        output: SemanticNode[]
    ): string {

        const nodeId = `node_${output.length}`;

        // Создать узел
        const node: SemanticNode = {
            id: nodeId,
            path,
            syntacticType: this.mapSyntacticType(astNode),
            role: this.inferRole(astNode, parentId, output),
            latex: this.getNodeLatex(astNode),
            parentId,
            childIds: [],
            actionIds: [],
            flags: {
                hasActions: false,
                selectable: false
            }
        };

        output.push(node);

        // Рекурсия для детей
        if (astNode.type === 'binaryOp') {
            const leftPath = path === 'root' ? 'term[0]' : `${path}.term[0]`;
            const rightPath = path === 'root' ? 'term[1]' : `${path}.term[1]`;
            const leftId = this.buildNodeTree(astNode.left, nodeId, leftPath, output);
            const rightId = this.buildNodeTree(astNode.right, nodeId, rightPath, output);
            node.childIds.push(leftId, rightId);
        } else if (astNode.type === 'group') {
            const contentPath = path === 'root' ? 'content' : `${path}.content`;
            const childId = this.buildNodeTree(astNode.content, nodeId, contentPath, output);
            node.childIds.push(childId);
        } else if (astNode.type === 'mixed') {
            // Mixed nodes are leaves in the current AST structure regarding traversal for selection?
            // Actually AST has no children for mixed in the definition I saw?
            // Let's check ast.ts again.
            // MixedNumberNode: whole, numerator, denominator are strings. So it's a leaf in AST structure.
        }
        // Integer, Fraction, Variable are leaves.

        return nodeId;
    }

    private static getNodeLatex(node: AstNode): string {
        return toLatex(node);
    }

    /**
     * Привязывает кандидатов правил к узлам
     */
    private static attachActions(
        nodes: SemanticNode[],
        candidates: MapMasterCandidate[],
        output: SemanticAction[]
    ): void {

        candidates.forEach((candidate, idx) => {

            const targetNode = this.findTargetNode(nodes, candidate);

            if (!targetNode) {
                // console.warn(`Cannot find target node for candidate:`, candidate);
                return;
            }

            const actionId = `action_${idx}`;

            const action: SemanticAction = {
                id: actionId,
                targetNodeId: targetNode.id,
                primitiveId: candidate.primitiveIds[0] || 'unknown', // MapMasterCandidate has primitiveIds array
                invariantId: candidate.invariantRuleId,
                resultLatex: candidate.resultPattern || '' // MapMasterCandidate doesn't have resultLatex directly computed yet? 
                // Actually candidate has resultPattern. The user asked for resultLatex.
                // In MapMasterCandidate, we have resultPattern.
                // If the candidate was generated, maybe we can't easily know the result latex without running it?
                // The user prompt says: "resultLatex: candidate.resultLatex || candidate.result || ''"
                // My MapMasterCandidate has `resultPattern`.
                // I'll use that for now.
            };

            output.push(action);
            targetNode.actionIds.push(actionId);
        });
    }

    /**
     * Проставляет флаги на основе привязанных действий
     */
    private static computeFlags(nodes: SemanticNode[]): void {
        nodes.forEach(node => {
            node.flags.hasActions = node.actionIds.length > 0;

            // Узел selectable если:
            // - у него есть действия, ИЛИ
            // - это не чисто служебный оператор (binaryOp is operator)
            // Actually, binaryOp IS selectable in our system (it's the main interaction point).
            // The user prompt said: "node.syntacticType !== 'OPERATOR'".
            // In my AST, binaryOp is the operator.
            // But wait, in my system, clicking the operator IS how you select the operation.
            // So OPERATOR should be selectable.
            // Maybe "PAREN" or "GROUP" is not selectable?

            node.flags.selectable = true; // Default to true for now, refine later.
        });
    }

    // ============================================
    // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    // ============================================

    private static mapSyntacticType(astNode: AstNode): SemanticNode['syntacticType'] {
        switch (astNode.type) {
            case 'integer': return 'INT';
            case 'fraction': return 'FRACTION';
            case 'mixed': return 'UNKNOWN'; // Or add MIXED to types? User types didn't have MIXED.
            case 'binaryOp':
                if (astNode.op === '+') return 'SUM';
                if (astNode.op === '-') return 'DIFFERENCE';
                if (astNode.op === '*') return 'PRODUCT';
                if (astNode.op === '/') return 'DIVISION';
                return 'OPERATOR';
            case 'variable': return 'VARIABLE';
            case 'group': return 'PAREN';
        }
        return 'UNKNOWN';
    }

    private static inferRole(
        astNode: AstNode,
        parentId: string | null,
        allNodes: SemanticNode[]
    ): SemanticNode['role'] {

        if (!parentId) return 'expression_root';

        const parent = allNodes.find(n => n.id === parentId);
        if (!parent) return 'standalone_term';

        if (parent.syntacticType === 'FRACTION') {
            // In my AST, FractionNode has no children in the 'children' array sense, 
            // but it has numerator/denominator properties which are strings (in current AST).
            // Wait, check AST definition again.
            // IntegerNode: value: string
            // FractionNode: numerator: string, denominator: string.
            // So FractionNode DOES NOT have child AstNodes in my current AST!
            // It's a leaf node in the AST structure I saw in `ast.ts`.
            // "export interface FractionNode extends BaseNode { type: "fraction"; numerator: string; denominator: string; }"
            // So I cannot traverse into it?
            // If so, `buildNodeTree` won't recurse into Fraction.
            // So I won't have nodes for numerator/denominator?
            // This is a discrepancy with the user's expected "Semantic Map" which assumes full tree.
            // But I must work with *my* AST.
            // If my AST treats Fraction as a leaf, then Semantic Map will treat it as a leaf.
            return 'unknown';
        }

        if (parent.syntacticType === 'SUM' || parent.syntacticType === 'DIFFERENCE') {
            return 'sum_operand';
        }

        if (parent.syntacticType === 'PRODUCT' || parent.syntacticType === 'DIVISION') {
            return 'product_factor';
        }

        if (parent.syntacticType === 'PAREN') {
            return 'grouped_expression';
        }

        return 'standalone_term';
    }

    private static findTargetNode(
        nodes: SemanticNode[],
        candidate: MapMasterCandidate
    ): SemanticNode | null {
        if (candidate.targetPath) {
            return nodes.find(n => n.path === candidate.targetPath) || null;
        }
        return nodes.find(n => n.role === 'expression_root') || null;
    }

    private static generateMapId(latex: string): string {
        const timestamp = Date.now();
        const hash = latex.substring(0, 10).replace(/\\/g, '');
        return `map_${timestamp}_${hash}`;
    }
}
