function isBinaryOp(node) {
    return node.type === "binaryOp";
}
function isFraction(node) {
    return node.type === "fraction";
}
function createIntAddPattern() {
    return {
        primitiveId: "P.INT_ADD",
        match(input) {
            const node = input.node;
            if (!isBinaryOp(node))
                return false;
            if (node.op !== "+")
                return false;
            return node.left.type === "integer" && node.right.type === "integer";
        },
    };
}
function createIntSubPattern() {
    return {
        primitiveId: "P.INT_SUB",
        match(input) {
            const node = input.node;
            if (!isBinaryOp(node))
                return false;
            if (node.op !== "-")
                return false;
            return node.left.type === "integer" && node.right.type === "integer";
        },
    };
}
function createFracAddSameDenPattern() {
    return {
        primitiveId: "P.FRAC_ADD_SAME_DEN",
        match(input) {
            const node = input.node;
            if (!isBinaryOp(node))
                return false;
            if (node.op !== "+")
                return false;
            if (!isFraction(node.left) || !isFraction(node.right))
                return false;
            return node.left.denominator === node.right.denominator;
        },
    };
}
function createFracSubSameDenPattern() {
    return {
        primitiveId: "P.FRAC_SUB_SAME_DEN",
        match(input) {
            const node = input.node;
            if (!isBinaryOp(node))
                return false;
            if (node.op !== "-")
                return false;
            if (!isFraction(node.left) || !isFraction(node.right))
                return false;
            return node.left.denominator === node.right.denominator;
        },
    };
}
function createIntDivToIntPattern() {
    return {
        primitiveId: "P.INT_DIV_TO_INT",
        match(input) {
            const node = input.node;
            if (!isBinaryOp(node))
                return false;
            // Matches both : and / because parser normalizes to /
            if (node.op !== "/")
                return false;
            return node.left.type === "integer" && node.right.type === "integer";
        },
    };
}
export function createPrimitivePatternRegistry() {
    const patterns = [
        createIntAddPattern(),
        createIntSubPattern(),
        createFracAddSameDenPattern(),
        createFracSubSameDenPattern(),
        createIntDivToIntPattern(),
        createIntToFracPattern(),
        createFracEquivPattern(),
        createFracMulPattern(),
        createFracDivPattern(),
    ];
    return {
        getPatternsFor(args) {
            // For V5, we return all applicable patterns based on coarse selection kind
            if (args.selectionKind === "operator") {
                return patterns;
            }
            if (args.selectionKind === "integer") {
                return [createIntToFracPattern()];
            }
            if (args.selectionKind === "fraction") {
                return [createFracEquivPattern()];
            }
            // Fallback: return everything or nothing? 
            // For safety, let's return relevant subsets or all if unsure, 
            // but MapMaster filters by invariant rules anyway.
            return patterns;
        },
    };
}
function createIntToFracPattern() {
    return {
        primitiveId: "P.INT_TO_FRAC",
        match(input) {
            return input.node.type === "integer";
        },
    };
}
function createFracEquivPattern() {
    return {
        primitiveId: "P.FRAC_EQUIV",
        match(input) {
            return isFraction(input.node);
        },
    };
}
function createFracMulPattern() {
    return {
        primitiveId: "P.FRAC_MUL",
        match(input) {
            const node = input.node;
            if (!isBinaryOp(node))
                return false;
            if (node.op !== "*")
                return false;
            return isFraction(node.left) && isFraction(node.right);
        },
    };
}
function createFracDivPattern() {
    return {
        primitiveId: "P.FRAC_DIV",
        match(input) {
            const node = input.node;
            if (!isBinaryOp(node))
                return false;
            // Supports both parsed division ops just in case
            if (node.op !== "/" && node.op !== ":")
                return false;
            return isFraction(node.left) && isFraction(node.right);
        },
    };
}
