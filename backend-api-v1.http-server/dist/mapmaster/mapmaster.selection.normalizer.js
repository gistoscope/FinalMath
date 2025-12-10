/**
 * MapMaster Selection Normalizer
 *
 * Normalizes user selection (from various sources like client events or TSA)
 * into a canonical "Anchor" that rules can operate on.
 */
/**
 * Default implementation of MapMaster selection normalization.
 *
 * Priority of selection sources:
 *  1) input.selectionPath (if valid path)
 *  2) input.operatorIndex
 *
 * If none of these yield a valid AST location, returns null.
 */
export class MapMasterSelectionNormalizer {
    constructor(astHelpers) {
        this.astHelpers = astHelpers;
    }
    normalizeSelection(input, rootAst) {
        const { selectionPath, operatorIndex } = input;
        // 1) selectionPath (highest priority)
        const fromSelectionPath = this.tryFromSelectionPath(rootAst, selectionPath);
        if (fromSelectionPath) {
            return fromSelectionPath;
        }
        // 2) operatorIndex
        const fromOperatorIndex = this.tryFromOperatorIndex(rootAst, operatorIndex);
        if (fromOperatorIndex) {
            return fromOperatorIndex;
        }
        // 3) Fallback to Root (if binary op)
        // Useful for Stage 1 where we often just send an expression without specific selection.
        // 3) Fallback to Root (if binary op)
        // Useful for Stage 1 where we often just send an expression without specific selection.
        if (rootAst.type === 'binaryOp') {
            return {
                anchorPath: [], // Root path
                anchorKind: 'Operator',
                trace: 'fallback:root'
            };
        }
        // No usable selection
        return null;
    }
    /**
     * Try to normalize from selectionPath.
     * Returns null if the path is absent or invalid.
     */
    tryFromSelectionPath(rootAst, selectionPath) {
        if (!selectionPath) {
            return null;
        }
        // Special case: "root" means anchor on the whole expression node.
        // This is used by Stage 1 tests like INT_TO_FRAC where we normalize a bare integer "3".
        if (selectionPath === "root") {
            const anchorPath = [];
            const anchorKind = this.classifyAnchorKind(rootAst, anchorPath);
            return {
                anchorPath,
                anchorKind,
                trace: 'input.selectionPath:root',
            };
        }
        // Convert string path (e.g. "term[0].term[1]") to AstPath array if needed.
        // Our AstHelpers.getNodeByPath expects AstPath (Array<string|number>).
        // But ast.ts getNodeAt expects string.
        // Let's assume AstHelpers handles the conversion or we convert here.
        // Since we defined AstPath as Array<string|number>, we should convert the string path to array.
        // Simple split by dot, but handling array indices like term[0] is tricky with simple split.
        // Actually, ast.ts paths are like "term[0].term[1]".
        // If we split by '.', we get ["term[0]", "term[1]"].
        // This matches what we likely want if AstHelpers iterates these segments.
        const anchorPath = selectionPath.split('.');
        const node = this.astHelpers.getNodeByPath(rootAst, anchorPath);
        if (!node) {
            return null;
        }
        const anchorKind = this.classifyAnchorKind(rootAst, anchorPath);
        return {
            anchorPath,
            anchorKind,
            trace: 'input.selectionPath',
        };
    }
    /**
     * Try to normalize from operatorIndex.
     * Returns null if the index is absent, negative, or out of bounds.
     */
    tryFromOperatorIndex(rootAst, operatorIndex) {
        if (operatorIndex === undefined || operatorIndex === null) {
            return null;
        }
        // Negative index is always invalid
        if (operatorIndex < 0) {
            return null;
        }
        const operatorPath = this.astHelpers.findNthOperator(rootAst, operatorIndex);
        if (!operatorPath) {
            // Out-of-bounds index
            return null;
        }
        return {
            anchorPath: operatorPath,
            anchorKind: 'Operator',
            trace: `input.operatorIndex:${operatorIndex}th operator`,
        };
    }
    /**
     * Classify the anchor node as Operator or Operand.
     * Uses AstHelpers to detect binary operator nodes.
     */
    classifyAnchorKind(rootAst, anchorPath) {
        const node = this.astHelpers.getNodeByPath(rootAst, anchorPath) ?? rootAst;
        // Binary operator node → Operator
        if (this.astHelpers.isBinaryOperator(node, '+') ||
            this.astHelpers.isBinaryOperator(node, '-') ||
            this.astHelpers.isBinaryOperator(node, '*') ||
            this.astHelpers.isBinaryOperator(node, '/')) {
            return 'Operator';
        }
        // Everything else (fractions, integers, etc.) → Operand
        return 'Operand';
    }
}
