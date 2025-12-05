/**
 * MapMaster AST & Parser (TzV1.1)
 * 
 * Provides a robust, recursive descent parser for mathematical expressions
 * supporting integers, fractions, mixed numbers, and binary operations.
 */

export type NodeType = "integer" | "fraction" | "mixed" | "binaryOp" | "variable";

export interface BaseNode {
    type: NodeType;
}

export interface IntegerNode extends BaseNode {
    type: "integer";
    value: string;
}

export interface FractionNode extends BaseNode {
    type: "fraction";
    numerator: string;
    denominator: string;
}

export interface MixedNumberNode extends BaseNode {
    type: "mixed";
    whole: string;
    numerator: string;
    denominator: string;
}

export interface BinaryOpNode extends BaseNode {
    type: "binaryOp";
    op: "+" | "-" | "*" | "/";
    left: AstNode;
    right: AstNode;
}

export interface VariableNode extends BaseNode {
    type: "variable";
    name: string;
}

export type AstNode = IntegerNode | FractionNode | MixedNumberNode | BinaryOpNode | VariableNode;

// --- Tokenizer ---

type TokenType = "NUMBER" | "OP" | "LPAREN" | "RPAREN" | "SLASH" | "SPACE" | "IDENTIFIER" | "LBRACE" | "RBRACE" | "COMMAND";

interface Token {
    type: TokenType;
    value: string;
    pos: number;
}

function tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    while (i < input.length) {
        const char = input[i];

        if (/\s/.test(char)) {
            // Coalesce spaces
            let val = char;
            i++;
            while (i < input.length && /\s/.test(input[i])) {
                val += input[i];
                i++;
            }
            tokens.push({ type: "SPACE", value: val, pos: i - val.length });
            continue;
        }

        if (/\d/.test(char)) {
            let val = char;
            i++;
            while (i < input.length && (/\d/.test(input[i]) || input[i] === ".")) {
                val += input[i];
                i++;
            }
            tokens.push({ type: "NUMBER", value: val, pos: i - val.length });
            continue;
        }

        if (/[a-zA-Z]/.test(char)) {
            let val = char;
            i++;
            while (i < input.length && /[a-zA-Z]/.test(input[i])) {
                val += input[i];
                i++;
            }
            tokens.push({ type: "IDENTIFIER", value: val, pos: i - val.length });
            continue;
        }

        if (char === "\\") {
            let val = ""; // Don't include backslash in value? Or do? Let's include it or just the name.
            // Let's just capture the command name.
            i++; // skip backslash
            while (i < input.length && /[a-zA-Z]/.test(input[i])) {
                val += input[i];
                i++;
            }
            tokens.push({ type: "COMMAND", value: val, pos: i - val.length - 1 });
            continue;
        }

        if (["+", "-", "*", "^"].includes(char)) {
            tokens.push({ type: "OP", value: char, pos: i });
            i++;
            continue;
        }

        if (char === "/") {
            tokens.push({ type: "SLASH", value: char, pos: i });
            i++;
            continue;
        }

        if (char === "(") {
            tokens.push({ type: "LPAREN", value: char, pos: i });
            i++;
            continue;
        }

        if (char === ")") {
            tokens.push({ type: "RPAREN", value: char, pos: i });
            i++;
            continue;
        }

        if (char === "{") {
            tokens.push({ type: "LBRACE", value: char, pos: i });
            i++;
            continue;
        }

        if (char === "}") {
            tokens.push({ type: "RBRACE", value: char, pos: i });
            i++;
            continue;
        }

        // Unknown char, skip or error? For now skip
        i++;
    }
    return tokens;
}

// --- Parser ---

export function parseExpression(latex: string): AstNode | undefined {
    const tokens = tokenize(latex).filter(t => t.type !== "SPACE" || t.value.includes(" "));
    const processedTokens = preprocessMixedNumbers(tokens);

    let pos = 0;

    function peek(): Token | undefined {
        return processedTokens[pos];
    }

    function consume(): Token | undefined {
        return processedTokens[pos++];
    }

    function parsePrimary(): AstNode {
        const token = peek();
        if (!token) throw new Error("Unexpected end of input");

        if (token.type === "NUMBER") {
            consume();
            // Check for lookahead slash for fraction
            if (peek()?.type === "SLASH") {
                consume(); // /
                const den = consume();
                if (den?.type !== "NUMBER" && den?.type !== "IDENTIFIER") throw new Error("Expected denominator");
                // Allow variable in denominator for patterns like 1/a
                if (den.type === "IDENTIFIER") {
                    return {
                        type: "fraction",
                        numerator: token.value,
                        denominator: den.value // This is a bit weird, fraction usually expects numbers. 
                        // But for patterns, we might want "1/a". 
                        // Actually, "1/a" is a division of integer 1 by variable a.
                        // Standard fraction node expects string values.
                        // Let's stick to strict fractions (num/num) for "fraction" type, 
                        // and treat 1/a as binaryOp(/) if we can.
                        // But wait, our parser eagerly consumes slash for fractions.
                        // If we want "a/b" to be a fraction pattern, we need to handle it.
                        // But "a/b" is structurally a division.
                        // "1/2" is a value.
                        // Let's restrict "fraction" type to ONLY numeric literals.
                        // Everything else with "/" is a binaryOp.
                    };
                }
                return {
                    type: "fraction",
                    numerator: token.value,
                    denominator: den.value
                };
            }
            return { type: "integer", value: token.value };
        }

        if (token.type === "IDENTIFIER") {
            consume();
            return { type: "variable", name: token.value };
        }

        // Handle unary minus (negative numbers)
        if (token.type === "OP" && token.value === "-") {
            consume();
            const next = peek();
            if (next?.type === "NUMBER") {
                consume();
                // Check for lookahead slash for negative fraction? -1/2
                if (peek()?.type === "SLASH") {
                    consume();
                    const den = consume();
                    if (den?.type !== "NUMBER") throw new Error("Expected denominator");
                    return {
                        type: "fraction",
                        numerator: `-${next.value}`,
                        denominator: den.value
                    };
                }
                return { type: "integer", value: `-${next.value}` };
            }
            throw new Error("Unexpected token after unary minus");
        }

        if (token.type === "LPAREN") {
            consume();
            const expr = parseAddSub();
            if (peek()?.type !== "RPAREN") throw new Error("Expected )");
            consume();
            return expr;
        }

        // Mixed number token (custom type we might add in preprocess)
        if (token.type === "MIXED" as any) {
            consume();
            const parts = token.value.split("_"); // Hacky encoding
            return {
                type: "mixed",
                whole: parts[0],
                numerator: parts[1],
                denominator: parts[2]
            };
        }

        if (token.type === "COMMAND") {
            consume();
            if (token.value === "left") {
                // Expect LPAREN or similar
                // Actually, \left is usually followed by ( or [ or \{ or |
                // For now, let's just consume the next token if it's a bracket/paren
                // and treat it as LPAREN for parsing purposes if it is (.
                const next = peek();
                if (next?.type === "LPAREN") {
                    consume(); // (
                    const expr = parseAddSub();
                    // Expect \right then RPAREN
                    const rightCmd = peek();
                    if (rightCmd?.type === "COMMAND" && rightCmd.value === "right") {
                        consume(); // \right
                        const rParen = peek();
                        if (rParen?.type === "RPAREN") {
                            consume(); // )
                            return expr; // Return inner expression, effectively ignoring \left( ... \right) wrapper
                        }
                        throw new Error("Expected ) after \\right");
                    }
                    throw new Error("Expected \\right after \\left(...)");
                }
                // Handle other delimiters if needed, e.g. \left| ... \right|
                throw new Error(`Unsupported delimiter after \\left: ${next?.value}`);
            }
            if (token.value === "frac") {
                // Expect { num } { den }
                if (peek()?.type !== "LBRACE") throw new Error("Expected { after \\frac");
                consume(); // {
                const num = parseAddSub(); // Allow expressions in numerator
                if (peek()?.type !== "RBRACE") throw new Error("Expected } after numerator");
                consume(); // }

                if (peek()?.type !== "LBRACE") throw new Error("Expected { for denominator");
                consume(); // {
                const den = parseAddSub(); // Allow expressions in denominator
                if (peek()?.type !== "RBRACE") throw new Error("Expected } after denominator");
                consume(); // }

                // Simplify: if num/den are integers, store as string values in FractionNode
                // If they are expressions, we might need a more complex FractionNode or just fail for now?
                // The current FractionNode expects strings for num/den.
                // If we want to support \frac{1+2}{3}, we need to change FractionNode or use BinaryOp(/).
                // But P.FRAC_ADD_SAME expects "fraction" type.
                // Let's assume for now they are simple values (Integer or Variable).

                // Simplify: if num/den are integers/vars, store as FractionNode
                // If they are expressions, return BinaryOp(/)

                let simpleNum = "";
                let simpleDen = "";
                let isSimple = true;

                if (num.type === "integer") simpleNum = num.value;
                else if (num.type === "variable") simpleNum = num.name;
                else isSimple = false;

                if (den.type === "integer") simpleDen = den.value;
                else if (den.type === "variable") simpleDen = den.name;
                else isSimple = false;

                if (isSimple) {
                    return {
                        type: "fraction",
                        numerator: simpleNum,
                        denominator: simpleDen
                    };
                } else {
                    return {
                        type: "binaryOp",
                        op: "/",
                        left: num,
                        right: den
                    };
                }
            }
            throw new Error(`Unknown command: \\${token.value}`);
        }

        throw new Error(`Unexpected token: ${token.value}`);
    }

    function parseMulDiv(): AstNode {
        let left = parsePrimary();

        while (peek() && (peek()?.value === "*" || peek()?.value === "/")) {
            const op = consume()!;
            const right = parsePrimary();
            left = {
                type: "binaryOp",
                op: op.value as any,
                left,
                right
            };
        }
        return left;
    }

    function parseAddSub(): AstNode {
        let left = parseMulDiv();

        while (peek() && (peek()?.value === "+" || peek()?.value === "-")) {
            const op = consume()!;
            const right = parseMulDiv();
            left = {
                type: "binaryOp",
                op: op.value as any,
                left,
                right
            };
        }
        return left;
    }

    try {
        return parseAddSub();
    } catch (e) {
        console.error("Parse error:", e);
        return undefined;
    }
}

function preprocessMixedNumbers(tokens: Token[]): Token[] {
    // Look for pattern: NUMBER, SPACE, NUMBER, SLASH, NUMBER
    // And ensure the SPACE is significant (not just formatting around op)
    // But we already filtered spaces? No, I kept them in tokenize but need to handle them here.

    const result: Token[] = [];
    let i = 0;

    // Helper to get next non-space token
    function peekNext(offset: number): Token | undefined {
        let k = i + offset;
        // This logic is flawed if we have random spaces.
        // Let's rely on the raw token stream including spaces.
        return tokens[k];
    }

    while (i < tokens.length) {
        const t = tokens[i];

        // Check for Mixed Number: Num, Space, Num, Slash, Num
        if (t.type === "NUMBER") {
            const t1 = tokens[i + 1];
            const t2 = tokens[i + 2];
            const t3 = tokens[i + 3];
            const t4 = tokens[i + 4];

            if (t1?.type === "SPACE" &&
                t2?.type === "NUMBER" &&
                t3?.type === "SLASH" &&
                t4?.type === "NUMBER") {

                // Found mixed number!
                result.push({
                    type: "MIXED" as any,
                    value: `${t.value}_${t2.value}_${t4.value}`,
                    pos: t.pos
                });
                i += 5;
                continue;
            }
        }

        if (t.type !== "SPACE") {
            result.push(t);
        }
        i++;
    }

    return result;
}

// --- Path Traversal Helpers ---

export function getNodeAt(ast: AstNode, path: string): AstNode | undefined {
    if (path === "root") return ast;

    // Path format: "term[0].term[1]" etc.
    // We need to map this to our AST.
    // Our AST is binary. "term[0]" usually means left, "term[1]" means right.

    const parts = path.split(".");
    let current: AstNode = ast;

    for (const part of parts) {
        if (part === "root") continue;

        if (current.type !== "binaryOp" && current.type !== "mixed") {
            // Can't traverse into integer or fraction (unless we define children for them?)
            // For mixed, we might want to traverse?
            // "term[0]" of mixed could be whole?
            // Let's stick to binary ops for now.
            return undefined;
        }

        if (current.type === "binaryOp") {
            if (part === "term[0]") {
                current = current.left;
            } else if (part === "term[1]") {
                current = current.right;
            } else {
                return undefined;
            }
        } else if (current.type === "mixed") {
            // Maybe support selecting parts of mixed number?
            // For now, assume mixed number is a leaf for "term" traversal, 
            // unless we define a schema for it.
            return undefined;
        }
    }

    return current;
}

export function getNodeByOperatorIndex(ast: AstNode, targetIndex: number): { node: AstNode, path: string } | undefined {
    let currentIndex = 0;
    let found: { node: AstNode, path: string } | undefined;

    function traverse(node: AstNode, path: string) {
        if (found) return;

        // Check if this node is an operator slot
        // Matches surface-map.js logic: BinaryOp, Fraction
        // We don't have Relation or MinusBinary distinct types, they are binaryOp.
        const isOp = node.type === "binaryOp" || node.type === "fraction";

        // Pre-order or In-order?
        // surface-map.js sorts by (left, top).
        // AST structure usually follows left-to-right.
        // So we should visit Left, then Self, then Right?
        // Or Self then Children?
        // surface-map.js sorts atoms.
        // For 2+3: 2(Num), +(Op), 3(Num).
        // + is at index 0.
        // In AST: binaryOp(+). Left=2, Right=3.
        // If we visit binaryOp first, it gets index 0.
        // If we visit Left(2), it's not op.
        // So Pre-order seems correct for the operator itself relative to operands?
        // Wait, for 1/2 + 3/4:
        // 1/2 (Frac, idx 0), + (Op, idx 1), 3/4 (Frac, idx 2).
        // AST: binaryOp(+). Left=Frac(1/2), Right=Frac(3/4).
        // If Pre-order: binaryOp is 0. Left is 1. Right is 2.
        // This assumes + is BEFORE 1/2? No, + is visually between.
        // But `surface-map.js` sorts by LEFT coordinate.
        // 1/2 is left of +. + is left of 3/4.
        // So order: Left Child, Self, Right Child (In-order).

        // In-order traversal for binaryOp!

        if (node.type === "binaryOp") {
            traverse(node.left, path === "root" ? "term[0]" : `${path}.term[0]`);
            if (found) return;

            // Visit Self
            if (currentIndex === targetIndex) {
                found = { node, path };
                return;
            }
            currentIndex++;

            traverse(node.right, path === "root" ? "term[1]" : `${path}.term[1]`);
            return;
        }

        // For Fraction: it's a leaf in terms of operators (usually).
        // Unless it contains operators in num/den?
        // Our AST Fraction has string num/den. So it's a leaf.
        if (node.type === "fraction") {
            // Visit Self
            if (currentIndex === targetIndex) {
                found = { node, path };
                return;
            }
            currentIndex++;
            return;
        }

        // For Mixed: A B/C.
        // Visually: A, then Fraction B/C.
        // So Mixed node effectively contains a Fraction.
        // If we count the mixed node as the fraction operator?
        if (node.type === "mixed") {
            if (currentIndex === targetIndex) {
                found = { node, path };
                return;
            }
            currentIndex++;
            return;
        }

        // Integer: count as indexable node
        if (node.type === "integer") {
            if (currentIndex === targetIndex) {
                found = { node, path };
                return;
            }
            currentIndex++;
            return;
        }

    }

    traverse(ast, "root");
    return found;
}

// --- Code Generation ---

export function toLatex(node: AstNode): string {
    if (node.type === "integer") {
        return node.value;
    }
    if (node.type === "fraction") {
        return `\\frac{${node.numerator}}{${node.denominator}}`;
    }
    if (node.type === "mixed") {
        return `${node.whole} \\frac{${node.numerator}}{${node.denominator}}`;
    }
    if (node.type === "binaryOp") {
        // Special handling for Division -> \frac
        if (node.op === "/") {
            return `\\frac{${toLatex(node.left)}}{${toLatex(node.right)}}`;
        }

        const left = toLatex(node.left);
        const right = toLatex(node.right);

        const leftParen = shouldParen(node.op, node.left, false);
        const rightParen = shouldParen(node.op, node.right, true);

        const lStr = leftParen ? `(${left})` : left;
        const rStr = rightParen ? `(${right})` : right;

        return `${lStr} ${node.op} ${rStr}`;
    }
    if (node.type === "variable") {
        return node.name;
    }
    return "";
}

function shouldParen(parentOp: string, child: AstNode, isRightChild: boolean): boolean {
    if (child.type !== "binaryOp") return false;
    const childOp = child.op;

    const prec = (op: string) => {
        if (op === "*" || op === "/") return 2;
        if (op === "+" || op === "-") return 1;
        return 0;
    };

    const pPrec = prec(parentOp);
    const cPrec = prec(childOp);

    if (cPrec < pPrec) return true;

    // Equal precedence
    if (cPrec === pPrec) {
        // Left-associative operators: -, /
        // If we are the right child of a left-associative op, we need parens.
        // e.g. a - (b - c) -> a - b + c (without parens it's wrong)
        // e.g. a / (b / c) -> a / b * c (without parens it's wrong)
        // e.g. a - (b + c) -> a - b - c (without parens it's wrong)

        // For + and *, they are associative (mostly), but subtraction is not.
        // If parent is - or /, right child ALWAYS needs parens if it's same precedence (or lower, already handled).
        if (isRightChild) {
            if (parentOp === "-" || parentOp === "/") return true;
        }

        // What about left child?
        // (a - b) - c -> a - b - c (fine)
        // (a / b) / c -> a / b / c (fine)
        // So left child usually doesn't need parens for equal precedence.
        return false;
    }
    return false;
}

export function replaceNodeAt(ast: AstNode, path: string, newNode: AstNode): AstNode {
    if (path === "root") return newNode;

    const parts = path.split(".");
    // We need to traverse and reconstruct or mutate.
    // Since we want to be safe, let's reconstruct (immutable update) or just mutate if we are careful.
    // For this stub engine, mutation is easier but we need parent pointer.
    // Reconstruct is safer.

    // Recursive helper
    function update(node: AstNode, parts: string[]): AstNode {
        if (parts.length === 0) return newNode;

        const part = parts[0];
        const remaining = parts.slice(1);

        if (node.type === "binaryOp") {
            if (part === "term[0]") {
                return { ...node, left: update(node.left, remaining) };
            } else if (part === "term[1]") {
                return { ...node, right: update(node.right, remaining) };
            }
        }
        // TODO: Handle mixed numbers if we support traversing them
        return node;
    }

    return update(ast, parts.filter(p => p !== "root"));
}
