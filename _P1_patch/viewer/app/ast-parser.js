/**
 * ast-parser.js
 * Minimal AST parser and utilities for the Viewer.
 * This duplicates essential parsing logic from the backend to enable
 * AST-aware operator mapping in the surface map.
 */

/**
 * Parse a LaTeX expression into an AST.
 * Handles basic arithmetic expressions with standard precedence.
 * @param {string} latex - LaTeX expression (e.g., "2 * 5 - 3 * 8 * 4")
 * @returns {Object|null} AST root node or null if parsing fails
 */
export function parseExpression(latex) {
    if (!latex || typeof latex !== "string") return null;

    const tokens = tokenize(latex);
    if (!tokens || tokens.length === 0) return null;

    let pos = 0;
    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];

    // Recursive descent parser
    // Expression hierarchy: AddSub > MulDiv > Primary

    function parseAddSub() {
        let left = parseMulDiv();
        while (peek() && isAddSub(peek().value)) {
            const opToken = consume();
            const right = parseMulDiv();
            left = {
                type: "binaryOp",
                op: normalizeOp(opToken.value),
                left,
                right,
            };
        }
        return left;
    }

    function parseMulDiv() {
        let left = parsePrimary();
        while (peek() && isMulDiv(peek().value)) {
            const opToken = consume();
            const right = parsePrimary();
            left = {
                type: "binaryOp",
                op: normalizeOp(opToken.value),
                left,
                right,
            };
        }
        return left;
    }

    function parsePrimary() {
        const token = peek();
        if (!token) return null;

        if (token.type === "NUMBER") {
            consume();
            return { type: "integer", value: token.value };
        }

        // Parentheses
        if (token.type === "LPAREN") {
            consume();
            const node = parseAddSub();
            if (peek() && peek().type === "RPAREN") {
                consume();
            }
            return node; // We drop parens in AST structure usually, or keep if needed. Backend usually drops them for calculation but AST might keep structure.
            // For mapping purposes, we just need the structure of ops.
        }

        // Unary minus
        if (token.value === "-" || token.value === "−") {
            consume();
            const next = parsePrimary();
            // Wrap in "unaryMinus" or just treat as negative number if immediate?
            // Backend often treats negative constant as constant.
            // But complex unary like -(2+3) is different.
            if (next && next.type === "integer") {
                next.value = "-" + next.value;
                return next;
            }
            // Fallback for simple parser: return as is if possible (rare in this simple grammar)
            return { type: "unaryOp", op: "-", arg: next };
        }

        // Fractions
        if (token.type === "FRAC") {
            consume();
            // Expect {num}{den}
            // Simple assumption: tokenize handles arguments? 
            // Actually standard tokenizer needs to handle arguments for \frac.
            // Let's simplify: our tokenizer emits FRAC then consumes groups.
            const num = parseGroup();
            const den = parseGroup();
            return { type: "fraction", args: [num, den] };
        }

        return null;
    }

    function parseGroup() {
        // Parse a { ... } group or single token
        if (peek() && peek().type === "LBRACE") {
            consume();
            const node = parseAddSub();
            if (peek() && peek().type === "RBRACE") {
                consume();
            }
            return node;
        }
        // Fallback: single digit or token? 
        // latex \frac 1 2 is valid but usually we see \frac{1}{2}.
        return parsePrimary();
    }

    try {
        return parseAddSub();
    } catch (e) {
        console.error("[AST Parser] Parse error:", e);
        return null;
    }
}

function isAddSub(op) {
    return ["+", "-", "−"].includes(op);
}

function isMulDiv(op) {
    return ["*", "×", "·", "⋅", "∗", "/", ":", "÷"].includes(op);
}

function normalizeOp(op) {
    if (op === "−") return "-";
    if (["×", "·", "⋅", "∗"].includes(op)) return "*";
    if (["÷", ":"].includes(op)) return "/";
    return op;
}

/**
 * Tokenizer for LaTeX arithmetic.
 * Handles: numbers, decimals, +, -, *, /, brackets, \frac, \cdot, \times, etc.
 */
function tokenize(input) {
    const tokens = [];
    let i = 0;

    while (i < input.length) {
        const char = input[i];

        if (/\s/.test(char)) {
            i++;
            continue;
        }

        // Numbers
        if (/\d/.test(char)) {
            let val = char;
            i++;
            while (i < input.length && (/\d/.test(input[i]) || input[i] === ".")) {
                val += input[i];
                i++;
            }
            tokens.push({ type: "NUMBER", value: val });
            continue;
        }

        // Commands (macros)
        if (char === "\\") {
            let cmd = "\\";
            i++;
            while (i < input.length && /[a-zA-Z]/.test(input[i])) {
                cmd += input[i];
                i++;
            }

            if (cmd === "\\frac") {
                tokens.push({ type: "FRAC", value: "\\frac" });
            } else if (cmd === "\\cdot" || cmd === "\\times") {
                tokens.push({ type: "OP", value: "*" });
            } else if (cmd === "\\div") {
                tokens.push({ type: "OP", value: "/" });
            } else if (cmd === "\\left" || cmd === "\\right") {
                // Ignore sizing commands for parsing structure if they are followed by parens
                // actually we check next char.
                // Usually \left( ... \right)
                // We can just skip them and let the next char be the token
                continue;
            } else {
                // Unknown command, maybe just skip or treat as variable?
            }
            continue;
        }

        // Brackets
        if (char === "(" || char === "[") {
            tokens.push({ type: "LPAREN", value: "(" });
            i++; continue;
        }
        if (char === ")" || char === "]") {
            tokens.push({ type: "RPAREN", value: ")" });
            i++; continue;
        }
        if (char === "{") {
            tokens.push({ type: "LBRACE", value: "{" });
            i++; continue;
        }
        if (char === "}") {
            tokens.push({ type: "RBRACE", value: "}" });
            i++; continue;
        }

        // Operators
        if ("+-−*×·⋅∗/:".includes(char)) {
            tokens.push({ type: "OP", value: char });
            i++;
            continue;
        }

        i++;
    }
    return tokens;
}

/**
 * Augment AST with node IDs using the backend's convention.
 * @param {Object} root - AST root node
 * @returns {Object} Augmented AST
 */
export function augmentAstWithIds(root) {
    if (!root) return root;

    function traverse(node, path) {
        if (!node) return;
        node.id = path;

        if (node.type === "binaryOp") {
            traverse(node.left, path === "root" ? "term[0]" : `${path}.term[0]`);
            traverse(node.right, path === "root" ? "term[1]" : `${path}.term[1]`);
        } else if (node.type === "fraction") {
            traverse(node.args[0], `${path}.num`);
            traverse(node.args[1], `${path}.den`);
        } else if (node.type === "unaryOp") {
            traverse(node.arg, `${path}.arg`);
        }
    }

    traverse(root, "root");
    return root;
}

/**
 * Enumerate all operators in the AST in in-order traversal.
 * @param {Object} ast - Augmented AST
 * @returns {Array} Array of operator descriptors
 */
export function enumerateOperators(ast) {
    const operators = [];
    let position = 0;

    function traverse(node) {
        if (!node) return;

        if (node.type === "binaryOp") {
            traverse(node.left);
            operators.push({
                nodeId: node.id,
                operator: node.op,
                position: position++,
            });
            traverse(node.right);
        } else if (node.type === "fraction") {
            traverse(node.args[0]);
            // Fraction bar is an operator in some contexts, but usually handled differently.
            // For linear expression tests, we focus on binary ops.
            traverse(node.args[1]);
        } else if (node.type === "unaryOp") {
            // Prefix operator
            // operators.push({ nodeId: node.id, operator: node.op, position: position++ });
            traverse(node.arg);
        }
    }

    traverse(ast);
    return operators;
}

/**
 * NEW: Enumerate all integers in the AST in in-order traversal.
 * @param {Object} ast - Augmented AST
 * @returns {Array} Array of integer descriptors with value and nodeId
 */
export function enumerateIntegers(ast) {
    const integers = [];
    let position = 0;

    function traverse(node) {
        if (!node) return;

        if (node.type === "integer") {
            integers.push({
                nodeId: node.id,
                value: node.value,
                position: position++,
            });
        } else if (node.type === "binaryOp") {
            traverse(node.left);
            traverse(node.right);
        } else if (node.type === "fraction") {
            // Numbers in fractions may be parsed as integers
            traverse(node.args[0]);
            traverse(node.args[1]);
        } else if (node.type === "unaryOp") {
            traverse(node.arg);
        }
    }

    traverse(ast);
    return integers;
}

export function buildASTFromLatex(latex) {
    const ast = parseExpression(latex);
    if (!ast) return null;
    return augmentAstWithIds(ast);
}

