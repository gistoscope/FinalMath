export class NodeContextBuilder {
    buildContext(params) {
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
                guards: {}
            };
        }
        console.log(`[NodeContext] Found Node type: ${node.type}`);
        // 2. Resolve Operator
        let operatorLatex = undefined;
        // Check internal operator
        if (node.op)
            operatorLatex = node.op;
        else if (node.ops && typeof click.operatorIndex === 'number') {
            operatorLatex = node.ops[click.operatorIndex];
        }
        // 3. Parent Lookup
        if (!operatorLatex) {
            const parent = this.findParent(ast, click.nodeId);
            if (parent) {
                console.log(`[NodeContext] Found Parent: ${parent.type}`);
                if (parent.op)
                    operatorLatex = parent.op;
                else if (parent.ops && typeof click.operatorIndex === 'number') {
                    operatorLatex = parent.ops[click.operatorIndex];
                }
            }
        }
        console.log(`[NodeContext] Operator: ${operatorLatex}`);
        // 4. Guards Stub (simplified for stability)
        const guards = {
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
        if (parent && parent.left && parent.right) {
            const left = parent.left;
            const right = parent.right;
            // Check for fractions directly or fractions inside wrappers (Mixed/etc) - though current types used are just checking props
            // We'll use a safer check for denominator existence
            const leftDen = left.denominator;
            const rightDen = right.denominator;
            if (leftDen && rightDen) {
                guards['denominators-equal'] = (leftDen === rightDen);
                guards['denominators-different'] = !guards['denominators-equal'];
            }
        }
        return {
            expressionId: params.expressionId,
            nodeId: click.nodeId,
            clickTarget: click,
            operatorLatex,
            leftOperandType: 'fraction',
            rightOperandType: 'fraction',
            guards
        };
    }
    // --- UNIVERSAL TRAVERSAL HELPERS ---
    findNode(root, id) {
        if (!root)
            return undefined;
        console.log("[DEBUG-VISIT]", root.id); // Uncommented for debugging
        if (root.id === id)
            return root;
        // 1. Binary Properties
        if (root.left) {
            const found = this.findNode(root.left, id);
            if (found)
                return found;
        }
        if (root.right) {
            const found = this.findNode(root.right, id);
            if (found)
                return found;
        }
        // 2. Array Properties (Universal check)
        const arrayProps = ['args', 'children', 'operands', 'terms', 'items', 'content'];
        for (const prop of arrayProps) {
            const list = root[prop];
            if (Array.isArray(list)) {
                for (const child of list) {
                    const found = this.findNode(child, id);
                    if (found)
                        return found;
                }
            }
        }
        // 3. Named Object Children (Universal check for single-node props like 'whole', 'numerator', 'denominator')
        const objProps = ['whole', 'numerator', 'denominator', 'base', 'exponent', 'content'];
        for (const prop of objProps) {
            const child = root[prop];
            if (child && typeof child === 'object' && child.type) {
                const found = this.findNode(child, id);
                if (found)
                    return found;
            }
        }
        return undefined;
    }
    findParent(root, targetId) {
        if (!root)
            return undefined;
        // 1. Check Binary Children
        if (root.left && root.left.id === targetId)
            return root;
        if (root.right && root.right.id === targetId)
            return root;
        // 2. Check Array Children
        const arrayProps = ['args', 'children', 'operands', 'terms', 'items', 'content'];
        for (const prop of arrayProps) {
            const list = root[prop];
            if (Array.isArray(list)) {
                for (const child of list) {
                    if (child.id === targetId)
                        return root;
                }
            }
        }
        // 2b. Check Object Children
        const objProps = ['whole', 'numerator', 'denominator', 'base', 'exponent', 'content'];
        for (const prop of objProps) {
            const child = root[prop];
            if (child && child.id === targetId)
                return root;
        }
        // 3. Recurse
        if (root.left) {
            const found = this.findParent(root.left, targetId);
            if (found)
                return found;
        }
        if (root.right) {
            const found = this.findParent(root.right, targetId);
            if (found)
                return found;
        }
        for (const prop of arrayProps) {
            const list = root[prop];
            if (Array.isArray(list)) {
                for (const child of list) {
                    const found = this.findParent(child, targetId);
                    if (found)
                        return found;
                }
            }
        }
        for (const prop of objProps) {
            const child = root[prop];
            if (child && typeof child === 'object' && child.type) {
                const found = this.findParent(child, targetId);
                if (found)
                    return found;
            }
        }
        return undefined;
    }
}
