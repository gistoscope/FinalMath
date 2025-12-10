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

        console.log(`[NodeContext] Building for Click: ${JSON.stringify(click)}`);

        // 1. Resolve Target Node
        const node = this.findNode(ast, click.nodeId);
        if (!node) {
            console.error(`[NodeContext] FAILED to find node: ${click.nodeId}`);
            // Log Root structure to debug
            console.log(`[DEBUG-ROOT]`, JSON.stringify(ast, null, 2));
            // throw new Error(`Node not found: ${click.nodeId}`); // Don't throw, return empty to prevent crash
            return {
                expressionId: params.expressionId,
                nodeId: click.nodeId,
                clickTarget: click,
                guards: {} as any
            };
        }
        console.log(`[NodeContext] Found Node type: ${node.type}`);

        // 2. Resolve Operator
        let operatorLatex: string | undefined = undefined;

        // Check internal operator
        if ((node as any).op) operatorLatex = (node as any).op;
        else if ((node as any).ops && typeof click.operatorIndex === 'number') {
            operatorLatex = (node as any).ops[click.operatorIndex];
        }

        let actionNodeId: string | undefined = undefined;

        // 3. Parent Lookup
        if (!operatorLatex) {
            const parent = this.findParent(ast, click.nodeId);
            if (parent) {
                console.log(`[NodeContext] Found Parent: ${parent.type}`);
                if ((parent as any).op) {
                    operatorLatex = (parent as any).op;
                    // If we found the operator on the parent, that parent usually IS the binary operation we want to execute on.
                    // Especially if the click was on a child (fraction/number).
                    // We store this valid binaryOp ID as the likely action target.
                    if ((parent as any).id) {
                        actionNodeId = (parent as any).id;
                    }
                }
                else if ((parent as any).ops && typeof click.operatorIndex === 'number') {
                    operatorLatex = (parent as any).ops[click.operatorIndex];
                }
            }
        }

        console.log(`[NodeContext] Operator: ${operatorLatex}`);

        // 4. Guards Stub (simplified for stability)
        const guards: Record<GuardId, boolean> = {
            "divisor-nonzero": false,
            "result-is-integer": false,
            "numerators-coprime": false,
            "denominators-equal": false,
            "denominators-different": false,
            "operands-free": true,
            "inside-brackets": false,
            "left-negative": false,
            "right-negative": false,
        };

        // Recalculate Denominators Equal using Parent
        const parent = this.findParent(ast, click.nodeId);
        if (parent && (parent as any).left && (parent as any).right) {
            const left = (parent as any).left;
            const right = (parent as any).right;
            // Check for fractions directly or fractions inside wrappers (Mixed/etc) - though current types used are just checking props
            // We'll use a safer check for denominator existence
            const leftDen = (left as any).denominator;
            const rightDen = (right as any).denominator;

            if (leftDen && rightDen) {
                guards['denominators-equal'] = (leftDen === rightDen);
                guards['denominators-different'] = !guards['denominators-equal'];
            }
        }

        // Determine Operand Types from the Action Node (which is either parent or the node itself)
        let leftType: OperandType = 'any';
        let rightType: OperandType = 'any';

        const actionNode = actionNodeId ? this.findNode(ast, actionNodeId) : node;

        if (actionNode && (actionNode as any).left) leftType = this.normalizeType((actionNode as any).left.type);
        if (actionNode && (actionNode as any).right) rightType = this.normalizeType((actionNode as any).right.type);

        return {
            expressionId: params.expressionId,
            nodeId: click.nodeId,
            clickTarget: click,
            operatorLatex,
            leftOperandType: leftType,
            rightOperandType: rightType,
            guards,
            actionNodeId
        };
    }

    // --- UNIVERSAL TRAVERSAL HELPERS ---

    private findNode(root: AstNode, id: string): AstNode | undefined {
        if (!root) return undefined;
        console.log("[DEBUG-VISIT]", (root as any).id); // Uncommented for debugging

        if ((root as any).id === id) return root;

        // 1. Binary Properties
        if ((root as any).left) {
            const found = this.findNode((root as any).left, id);
            if (found) return found;
        }
        if ((root as any).right) {
            const found = this.findNode((root as any).right, id);
            if (found) return found;
        }

        // 2. Array Properties (Universal check)
        const arrayProps = ['args', 'children', 'operands', 'terms', 'items', 'content'];
        for (const prop of arrayProps) {
            const list = (root as any)[prop];
            if (Array.isArray(list)) {
                for (const child of list) {
                    const found = this.findNode(child, id);
                    if (found) return found;
                }
            }
        }

        // 3. Named Object Children (Universal check for single-node props like 'whole', 'numerator', 'denominator')
        const objProps = ['whole', 'numerator', 'denominator', 'base', 'exponent', 'content'];
        for (const prop of objProps) {
            const child = (root as any)[prop];
            if (child && typeof child === 'object' && child.type) {
                const found = this.findNode(child, id);
                if (found) return found;
            }
        }

        return undefined;
    }

    private normalizeType(astType: string): OperandType {
        if (astType === 'integer') return 'int';
        if (astType === 'fraction') return 'fraction';
        if (astType === 'mixed') return 'mixed-number';
        return 'any';
    }

    private findParent(root: AstNode, targetId: string): AstNode | undefined {
        if (!root) return undefined;

        // 1. Check Binary Children
        if ((root as any).left && (root as any).left.id === targetId) return root;
        if ((root as any).right && (root as any).right.id === targetId) return root;

        // 2. Check Array Children
        const arrayProps = ['args', 'children', 'operands', 'terms', 'items', 'content'];
        for (const prop of arrayProps) {
            const list = (root as any)[prop];
            if (Array.isArray(list)) {
                for (const child of list) {
                    if ((child as any).id === targetId) return root;
                }
            }
        }

        // 2b. Check Object Children
        const objProps = ['whole', 'numerator', 'denominator', 'base', 'exponent', 'content'];
        for (const prop of objProps) {
            const child = (root as any)[prop];
            if (child && (child as any).id === targetId) return root;
        }

        // 3. Recurse
        if ((root as any).left) {
            const found = this.findParent((root as any).left, targetId);
            if (found) return found;
        }
        if ((root as any).right) {
            const found = this.findParent((root as any).right, targetId);
            if (found) return found;
        }
        for (const prop of arrayProps) {
            const list = (root as any)[prop];
            if (Array.isArray(list)) {
                for (const child of list) {
                    const found = this.findParent(child, targetId);
                    if (found) return found;
                }
            }
        }
        for (const prop of objProps) {
            const child = (root as any)[prop];
            if (child && typeof child === 'object' && child.type) {
                const found = this.findParent(child, targetId);
                if (found) return found;
            }
        }

        return undefined;
    }
}
