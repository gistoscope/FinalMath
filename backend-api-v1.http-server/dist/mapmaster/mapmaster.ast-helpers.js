/**
 * MapMaster AST Helpers
 *
 * Adapts generic AST navigation and inspection from CLOD to work with
 * the concrete AstNode types in this repository.
 */
/**
 * Concrete implementation of AstHelpers.
 */
export class MapMasterAstHelpers {
    /**
     * Navigate to a node by following a path through the AST.
     * Adapts array-based path to the dot-notation path expected by ast.ts if needed,
     * or implements direct traversal.
     *
     * Since ast.ts uses specific path strings like "term[0]", we should try to map
     * our generic AstPath to that format OR implement generic traversal that matches
     * the structure of AstNode.
     *
     * AstNode structure:
     * BinaryOp: left, right
     * Fraction: numerator, denominator (strings!) -> Wait, ast.ts FractionNode has string num/den.
     * Mixed: whole, numerator, denominator (strings)
     *
     * CLOD expected object traversal.
     *
     * If we use generic traversal, we need to handle the fact that `numerator` in FractionNode is a string,
     * not a Node. But `getFractionParts` expects Nodes.
     * We might need to wrap the string values into IntegerNodes for consistency with CLOD's expectations?
     */
    getNodeByPath(root, path) {
        let current = root;
        for (const segment of path) {
            if (current === null || current === undefined) {
                return undefined;
            }
            // Handle specific AstNode structure mapping if necessary
            // For now, assume path segments match property names (left, right, etc.)
            // Note: ast.ts `getNodeAt` uses "term[0]" for left, "term[1]" for right.
            // If `path` comes from `findNthOperator`, it will be constructed by us.
            // If it comes from client, it might be array of strings.
            if (typeof segment === 'string') {
                current = current[segment];
            }
            else if (typeof segment === 'number') {
                if (Array.isArray(current)) {
                    current = current[segment];
                }
                else {
                    return undefined;
                }
            }
        }
        if (current && typeof current === 'object' && 'type' in current) {
            return current;
        }
        // If we navigated to a string property (like fraction numerator), we might need to wrap it?
        // CLOD's `ExpressionAstNode` implies an object.
        // If `current` is a string (e.g. "5"), we can wrap it in an IntegerNode.
        if (typeof current === 'string') {
            // Heuristic: check if it looks like a number
            if (/^-?\d+$/.test(current)) {
                return { type: 'integer', value: current };
            }
            // Variable?
            if (/^[a-zA-Z]+$/.test(current)) {
                return { type: 'variable', name: current };
            }
        }
        return undefined;
    }
    getParentPath(path) {
        if (path.length === 0) {
            return undefined;
        }
        return path.slice(0, -1);
    }
    isBinaryOperator(node, symbol) {
        if (!node || node.type !== 'binaryOp') {
            return false;
        }
        return node.op === symbol;
    }
    isFraction(node) {
        if (!node)
            return false;
        return node.type === 'fraction';
    }
    getFractionParts(node) {
        if (!this.isFraction(node)) {
            return undefined;
        }
        const frac = node; // Cast to access concrete fields
        // In ast.ts, numerator and denominator are STRINGS.
        // We need to return ExpressionAstNode.
        // So we wrap them in IntegerNodes (or VariableNodes).
        const numVal = frac.numerator;
        const denVal = frac.denominator;
        const numNode = /^-?\d+$/.test(numVal)
            ? { type: 'integer', value: numVal }
            : { type: 'variable', name: numVal };
        const denNode = /^-?\d+$/.test(denVal)
            ? { type: 'integer', value: denVal }
            : { type: 'variable', name: denVal };
        return { numerator: numNode, denominator: denNode };
    }
    findNthOperator(root, operatorIndex) {
        let count = 0;
        const result = this.dfsForOperator(root, [], operatorIndex, { count });
        return result;
    }
    dfsForOperator(node, currentPath, targetIndex, state) {
        if (!node || typeof node !== 'object' || !('type' in node)) {
            return undefined;
        }
        // Check if this node is a binary operator
        if (node.type === 'binaryOp') {
            if (state.count === targetIndex) {
                return currentPath;
            }
            state.count++;
            // Traverse children: left then right
            const leftRes = this.dfsForOperator(node.left, [...currentPath, 'left'], targetIndex, state);
            if (leftRes)
                return leftRes;
            const rightRes = this.dfsForOperator(node.right, [...currentPath, 'right'], targetIndex, state);
            if (rightRes)
                return rightRes;
            return undefined;
        }
        // Traverse other node types if they contain children
        // Fraction/Mixed have string children in this AST, so no recursion needed for operators inside them
        // (unless we change AST definition to allow nested expressions in fractions, which ast.ts parser supports but types say string?)
        // ast.ts: FractionNode { numerator: string; denominator: string; }
        // So we stop at fractions.
        return undefined;
    }
}
