/**
 * MapMaster AST & Parser (TzV1.1)
 * 
 * Provides a robust, recursive descent parser for mathematical expressions
 * supporting integers, fractions, mixed numbers, and binary operations.
 */

export type NodeType = "integer" | "fraction" | "mixed" | "binaryOp" | "variable" | "group";

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

export interface GroupNode extends BaseNode {
    type: "group";
    content: AstNode;
    isLeftRight?: boolean;
}

export type AstNode = IntegerNode | FractionNode | MixedNumberNode | BinaryOpNode | VariableNode | GroupNode;

// ... Tokenizer (unchanged) ...

// ... Parser (unchanged) ...

// ... Path Traversal Helpers ...

export function getNodeAt(ast: AstNode, path: string): AstNode | undefined {
    if (path === "root") return ast;

    const parts = path.split(".");
    let current: AstNode = ast;

    for (const part of parts) {
        if (part === "root") continue;

        if (current.type === "group") {
            if (part === "content") {
                current = current.content;
                continue;
            }
            return undefined;
        }

        if (current.type !== "binaryOp" && current.type !== "mixed") {
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

        if (node.type === "group") {
            traverse(node.content, path === "root" ? "content" : `${path}.content`);
            return;
        }

        const isOp = node.type === "binaryOp" || node.type === "fraction";

        if (node.type === "binaryOp") {
            traverse(node.left, path === "root" ? "term[0]" : `${path}.term[0]`);
            if (found) return;

            if (currentIndex === targetIndex) {
                found = { node, path };
                return;
            }
            currentIndex++;

            traverse(node.right, path === "root" ? "term[1]" : `${path}.term[1]`);
            return;
        }

        if (node.type === "fraction") {
            if (currentIndex === targetIndex) {
                found = { node, path };
                return;
            }
            currentIndex++;
            return;
        }

        // Removed Mixed and Integer counting to match Viewer logic
    }

    traverse(ast, "root");
    return found;
}

// ... Code Generation (unchanged) ...

export function replaceNodeAt(ast: AstNode, path: string, newNode: AstNode): AstNode {
    if (path === "root") return newNode;

    const parts = path.split(".");

    function update(node: AstNode, parts: string[]): AstNode {
        if (parts.length === 0) return newNode;

        const part = parts[0];
        const remaining = parts.slice(1);

        if (node.type === "group" && part === "content") {
            return { ...node, content: update(node.content, remaining) };
        }

        if (node.type === "binaryOp") {
            if (part === "term[0]") {
                return { ...node, left: update(node.left, remaining) };
            } else if (part === "term[1]") {
                return { ...node, right: update(node.right, remaining) };
            }
        }
        return node;
    }

    return update(ast, parts.filter(p => p !== "root"));
}

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

            // Check for Mixed Number: NUMBER followed by \frac
            if (peek()?.type === "COMMAND" && peek()?.value === "frac") {
                consume(); // \frac

                // Parse Numerator
                if (peek()?.type !== "LBRACE") throw new Error("Expected { after \\frac");
                consume(); // {
                const numToken = consume();
                if (numToken?.type !== "NUMBER") throw new Error("Expected number in mixed fraction numerator");
                if (peek()?.type !== "RBRACE") throw new Error("Expected }");
                consume(); // }

                // Parse Denominator
                if (peek()?.type !== "LBRACE") throw new Error("Expected { for mixed fraction denominator");
                consume(); // {
                const denToken = consume();
                if (denToken?.type !== "NUMBER") throw new Error("Expected number in mixed fraction denominator");
                if (peek()?.type !== "RBRACE") throw new Error("Expected }");
                consume(); // }

                return {
                    type: "mixed",
                    whole: token.value,
                    numerator: numToken.value,
                    denominator: denToken.value
                };
            }

            // Check for lookahead slash for fraction
            if (peek()?.type === "SLASH") {
                const next = processedTokens[pos + 1]; // peek next next
                if (next && (next.type === "NUMBER" || next.type === "IDENTIFIER")) {
                    consume(); // /
                    const den = consume(); // number or identifier

                    if (den?.type === "IDENTIFIER") {
                        return {
                            type: "fraction",
                            numerator: token.value,
                            denominator: den.value
                        };
                    }
                    return {
                        type: "fraction",
                        numerator: token.value,
                        denominator: den!.value
                    };
                }
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
            return { type: "group", content: expr };
        }

        if (token.type === "MIXED" as any) {
            consume();
            const parts = token.value.split("_");
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
                const next = peek();
                if (next?.type === "LPAREN") {
                    consume(); // (
                    const expr = parseAddSub();
                    const rightCmd = peek();
                    if (rightCmd?.type === "COMMAND" && rightCmd.value === "right") {
                        consume(); // \right
                        const rParen = peek();
                        if (rParen?.type === "RPAREN") {
                            consume(); // )
                            return { type: "group", content: expr, isLeftRight: true };
                        }
                        throw new Error("Expected ) after \\right");
                    }
                    throw new Error("Expected \\right after \\left(...)");
                }
                throw new Error(`Unsupported delimiter after \\left: ${next?.value}`);
            }
            if (token.value === "frac") {
                if (peek()?.type !== "LBRACE") throw new Error("Expected { after \\frac");
                consume(); // {
                const num = parseAddSub();
                if (peek()?.type !== "RBRACE") throw new Error("Expected } after numerator");
                consume(); // }

                if (peek()?.type !== "LBRACE") throw new Error("Expected { for denominator");
                consume(); // {
                const den = parseAddSub();
                if (peek()?.type !== "RBRACE") throw new Error("Expected } after denominator");
                consume(); // }

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
    if (node.type === "group") {
        const inner = toLatex(node.content);
        if (node.isLeftRight) {
            return `\\left(${inner}\\right)`;
        }
        return `(${inner})`;
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


