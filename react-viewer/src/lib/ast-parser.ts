/**
 * ast-parser.ts
 * Minimal AST parser and utilities for the Viewer.
 * This duplicates essential parsing logic from the backend to enable
 * AST-aware operator mapping in the surface map.
 */

export interface Token {
  type: "NUMBER" | "OP" | "FRAC" | "LPAREN" | "RPAREN" | "LBRACE" | "RBRACE";
  value: string;
}

export interface AstNode {
  type: "binaryOp" | "integer" | "fraction" | "unaryOp";
  id?: string;
  op?: string;
  value?: string;
  left?: AstNode;
  right?: AstNode;
  arg?: AstNode;
  args?: AstNode[];
}

export interface OperatorDescriptor {
  nodeId: string;
  operator: string;
  position: number;
}

export interface IntegerDescriptor {
  nodeId: string;
  value: string;
  position: number;
}

/**
 * Parse a LaTeX expression into an AST.
 * Handles basic arithmetic expressions with standard precedence.
 * @param {string} latex - LaTeX expression (e.g., "2 * 5 - 3 * 8 * 4")
 * @returns {Object|null} AST root node or null if parsing fails
 */
export function parseExpression(latex: string): AstNode | null {
  if (!latex || typeof latex !== "string") return null;

  const tokens = tokenize(latex);
  if (!tokens || tokens.length === 0) return null;

  let pos = 0;
  const peek = (): Token | undefined => tokens[pos];
  const consume = (): Token => tokens[pos++];

  // Recursive descent parser
  // Expression hierarchy: AddSub > MulDiv > Primary

  function parseAddSub(): AstNode | null {
    let left = parseMulDiv();
    while (peek() && isAddSub(peek()!.value)) {
      const opToken = consume();
      const right = parseMulDiv();
      if (!left || !right) return null; // Safe guard
      left = {
        type: "binaryOp",
        op: normalizeOp(opToken.value),
        left,
        right,
      };
    }
    return left;
  }

  function parseMulDiv(): AstNode | null {
    let left = parsePrimary();
    while (peek() && isMulDiv(peek()!.value)) {
      const opToken = consume();
      const right = parsePrimary();
      if (!left || !right) return null; // Safe guard
      left = {
        type: "binaryOp",
        op: normalizeOp(opToken.value),
        left,
        right,
      };
    }
    return left;
  }

  function parsePrimary(): AstNode | null {
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
      if (peek() && peek()!.type === "RPAREN") {
        consume();
      }
      return node;
    }

    // Unary minus
    if (token.value === "-" || token.value === "−") {
      consume();
      const next = parsePrimary();
      if (!next) return null;

      if (next.type === "integer" && next.value) {
        next.value = "-" + next.value;
        return next;
      }
      return { type: "unaryOp", op: "-", arg: next };
    }

    // Fractions
    if (token.type === "FRAC") {
      consume();
      const num = parseGroup();
      const den = parseGroup();
      if (!num || !den) return null;
      return { type: "fraction", args: [num, den] };
    }

    return null; // Unexpected
  }

  function parseGroup(): AstNode | null {
    // Parse a { ... } group or single token
    if (peek() && peek()!.type === "LBRACE") {
      consume();
      const node = parseAddSub();
      if (peek() && peek()!.type === "RBRACE") {
        consume();
      }
      return node;
    }
    return parsePrimary();
  }

  try {
    return parseAddSub();
  } catch (e) {
    console.error("[AST Parser] Parse error:", e);
    return null;
  }
}

function isAddSub(op: string): boolean {
  return ["+", "-", "−"].includes(op);
}

function isMulDiv(op: string): boolean {
  return ["*", "×", "·", "⋅", "∗", "/", ":", "÷"].includes(op);
}

function normalizeOp(op: string): string {
  if (op === "−") return "-";
  if (["×", "·", "⋅", "∗"].includes(op)) return "*";
  if (["÷", ":"].includes(op)) return "/";
  return op;
}

/**
 * Tokenizer for LaTeX arithmetic.
 */
function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
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
        continue;
      } else {
        // Unknown command
      }
      continue;
    }

    // Brackets
    if (char === "(" || char === "[") {
      tokens.push({ type: "LPAREN", value: "(" });
      i++;
      continue;
    }
    if (char === ")" || char === "]") {
      tokens.push({ type: "RPAREN", value: ")" });
      i++;
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "LBRACE", value: "{" });
      i++;
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "RBRACE", value: "}" });
      i++;
      continue;
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
export function augmentAstWithIds(root: AstNode): AstNode {
  if (!root) return root;

  function traverse(node: AstNode | undefined, path: string) {
    if (!node) return;
    node.id = path;

    if (node.type === "binaryOp") {
      traverse(node.left, path === "root" ? "term[0]" : `${path}.term[0]`);
      traverse(node.right, path === "root" ? "term[1]" : `${path}.term[1]`);
    } else if (node.type === "fraction" && node.args) {
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
export function enumerateOperators(ast: AstNode): OperatorDescriptor[] {
  const operators: OperatorDescriptor[] = [];
  let position = 0;

  function traverse(node: AstNode | undefined) {
    if (!node) return;

    if (node.type === "binaryOp") {
      traverse(node.left);
      if (node.id && node.op) {
        operators.push({
          nodeId: node.id,
          operator: node.op,
          position: position++,
        });
      }
      traverse(node.right);
    } else if (node.type === "fraction" && node.args) {
      traverse(node.args[0]);
      traverse(node.args[1]);
    } else if (node.type === "unaryOp") {
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
export function enumerateIntegers(ast: AstNode): IntegerDescriptor[] {
  const integers: IntegerDescriptor[] = [];
  let position = 0;

  function traverse(node: AstNode | undefined) {
    if (!node) return;

    if (node.type === "integer" && node.id && node.value) {
      integers.push({
        nodeId: node.id,
        value: node.value,
        position: position++,
      });
    } else if (node.type === "binaryOp") {
      traverse(node.left);
      traverse(node.right);
    } else if (node.type === "fraction" && node.args) {
      traverse(node.args[0]);
      traverse(node.args[1]);
    } else if (node.type === "unaryOp") {
      traverse(node.arg);
    }
  }

  traverse(ast);
  return integers;
}

export function buildASTFromLatex(latex: string): AstNode | null {
  const ast = parseExpression(latex);
  if (!ast) return null;
  return augmentAstWithIds(ast);
}

/**
 * Convert AST to instrumented LaTeX with data-ast-id wrappers.
 * Uses KaTeX's \htmlData command to embed AST node IDs into DOM.
 */
export function toInstrumentedLatex(ast: AstNode): string {
  if (!ast) return "";

  function escapeNodeId(id: string): string {
    return (id || "").replace(/[{}\\]/g, "");
  }

  function wrapNumber(value: string, nodeId: string): string {
    const escaped = escapeNodeId(nodeId);
    return `\\htmlData{ast-id=${escaped}, role=number}{${value}}`;
  }

  function wrapOperator(op: string, nodeId: string): string {
    const escaped = escapeNodeId(nodeId);
    let latexOp = op;
    if (op === "*") latexOp = "\\cdot";
    if (op === "/") latexOp = "\\div";
    return `\\htmlData{ast-id=${escaped}, role=operator, operator=${op}}{${latexOp}}`;
  }

  function traverse(node: AstNode | undefined): string {
    if (!node) return "";

    if (node.type === "integer" && node.value && node.id) {
      return wrapNumber(node.value, node.id);
    }

    if (
      node.type === "binaryOp" &&
      node.left &&
      node.right &&
      node.op &&
      node.id
    ) {
      const left = traverse(node.left);
      const op = wrapOperator(node.op, node.id);
      const right = traverse(node.right);
      return `${left} ${op} ${right}`;
    }

    if (node.type === "fraction" && node.args && node.id) {
      const num = traverse(node.args[0]);
      const den = traverse(node.args[1]);
      return `\\htmlData{ast-id=${escapeNodeId(
        node.id
      )}, role=fraction}{\\frac{${num}}{${den}}}`;
    }

    if (node.type === "unaryOp" && node.arg) {
      return `-${traverse(node.arg)}`;
    }

    return "";
  }

  return traverse(ast);
}

export interface InstrumentResult {
  success: boolean;
  latex: string;
  reason?: string;
}

/**
 * Convert LaTeX to instrumented LaTeX by parsing then re-serializing.
 */
export function instrumentLatex(latex: string): InstrumentResult {
  const ast = buildASTFromLatex(latex);

  if (!ast) {
    const reason = "AST parser failed to parse expression";
    console.error(
      `[BUG] STABLE-ID instrumentation failed: ${reason}. LaTeX: "${latex}"`
    );
    return {
      success: false,
      latex: latex,
      reason,
    };
  }

  const instrumented = toInstrumentedLatex(ast);

  if (!instrumented || instrumented.trim() === "") {
    const reason = "toInstrumentedLatex returned empty result";
    console.error(
      `[BUG] STABLE-ID instrumentation failed: ${reason}. LaTeX: "${latex}"`
    );
    return {
      success: false,
      latex: latex,
      reason,
    };
  }

  return {
    success: true,
    latex: instrumented,
  };
}
