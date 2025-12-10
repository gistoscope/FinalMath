import { AstNode } from '../../mapmaster/ast';
import {
    NodeContext,
    ExpressionId,
    ClickTarget,
    OperandType,
    Domain,
    GuardId
} from '../primitives.registry.v5';

export class NodeContextBuilder {

    public buildContext(params: {
        expressionId: ExpressionId;
        ast: AstNode;
        click: ClickTarget;
    }): NodeContext {
        const { ast, click } = params;

        // 1. Resolve Target Node
        const node = this.findNode(ast, click.nodeId);
        if (!node) {
            // Fallback: Return empty context instead of throwing, to avoid crashing the server
            console.error(`[NodeContext] Node not found: ${click.nodeId}`);
            return {
                expressionId: params.expressionId,
                nodeId: click.nodeId,
                clickTarget: click,
                guards: {} as any
            };
        }

        // 2. Resolve Operator
        let operatorLatex: string | undefined = undefined;

        // Check if the node itself has the operator (e.g. BinaryOp)
        if ((node as any).op) {
            operatorLatex = (node as any).op;
        }
        // Check if it's an N-ary node with an ops array
        else if ((node as any).ops && typeof click.operatorIndex === 'number') {
            operatorLatex = (node as any).ops[click.operatorIndex];
        }

        // 3. Parent Lookup (If operator is still undefined)
        if (!operatorLatex) {
            const parent = this.findParent(ast, click.nodeId);
            if (parent) {
                console.log(`[NodeContext] Found Parent: ${parent.type}`);
                // Parent is BinaryOp
                if ((parent as any).op) {
                    operatorLatex = (parent as any).op;
                }
                // Parent is N-ary (ChainOp)
                else if ((parent as any).ops && typeof click.operatorIndex === 'number') {
                    operatorLatex = (parent as any).ops[click.operatorIndex];
                }
            }
        }

        console.log(`[NodeContext] ClickTarget: ${JSON.stringify(click)}`);
        console.log(`[NodeContext] Operator: ${operatorLatex}`);

        // 4. Analyze Operands (Simplified for debugging)
        // In a real scenario, we would determine left/right based on the parent/child relationship
        // For now, we stub this to allow the Matcher to proceed.

        // 5. Compute Guards
        const guards: Record<GuardId, boolean> = {
            "divisor-nonzero": false,
            "result-is-integer": false,
            "numerators-coprime": false,
            "denominators-equal": false,
            "denominators-different": false,
            "operands-free": true,
            "inside-brackets": false,
            "left-negative": false,
            "right-negative": false
        };

        // Calculate Denominators Equal logic
        // We need to look at the parent to find sibling fractions
        const parent = this.findParent(ast, click.nodeId);
        if (parent && (parent as any).left && (parent as any).right) {
            const left = (parent as any).left;
            const right = (parent as any).right;

            if (left.type === 'fraction' && right.type === 'fraction') {
                if (left.denominator === right.denominator) {
                    guards['denominators-equal'] = true;
                } else {
                    guards['denominators-different'] = true;
                }
            }
        }

        console.log(`[NodeContext] Guards:`, JSON.stringify(guards, null, 2));

        return {
            expressionId: params.expressionId,
            nodeId: click.nodeId,
            clickTarget: click,
            operatorLatex,
            leftOperandType: 'fraction', // Stubbed for stability
            if((root as any).right) {
            const found = this.findNode((root as any).right, id);
            if (found) return found;
        }

        // Array Check
        const children = (root as any).args || (root as any).children || (root as any).operands;
        if (Array.isArray(children)) {
            for (const child of children) {
                const found = this.findNode(child, id);
                if (found) return found;
            }
        }
        return undefined;
    }

    private findParent(root: AstNode, targetId: string): AstNode | undefined {
        if (!root) return undefined;

        // Binary Parent Check
        if ((root as any).left && (root as any).left.id === targetId) return root;
        if ((root as any).right && (root as any).right.id === targetId) return root;

        // Array Parent Check
        const children = (root as any).args || (root as any).children || (root as any).operands;
        if (Array.isArray(children)) {
            for (const child of children) {
                if (child.id === targetId) return root;
            }
        }

        // Recursion
        // Recurse Binary
        if ((root as any).left) {
            const found = this.findParent((root as any).left, targetId);
            if (found) return found;
        }
        if ((root as any).right) {
            const found = this.findParent((root as any).right, targetId);
            if (found) return found;
        }

        // Recurse Array
        if (Array.isArray(children)) {
            for (const child of children) {
                const found = this.findParent(child, targetId);
                if (found) return found;
            }
        }

        return undefined;
    }
}
