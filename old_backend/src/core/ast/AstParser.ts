/**
 * AstParser Class
 *
 * Parses LaTeX expressions into AST.
 *
 * Responsibilities:
 *  - Parse LaTeX strings into AST nodes
 *  - Handle various mathematical expressions
 */

import { container, singleton } from "tsyringe";
import type { AstNode, Token } from "./ast.types.js";

/**
 * AstParser - Parses LaTeX expressions into AST
 */
@singleton()
export class AstParser {
  /**
   * Parse a LaTeX expression into an AST.
   */
  parse(latex: string): AstNode | undefined {
    return this.parseExpression(latex);
  }

  /**
   * Parse an expression.
   */
  parseExpression(latex: string): AstNode | undefined {
    const tokens = this.tokenize(latex).filter((t) => t.type !== "SPACE" || t.value.includes(" "));
    const processedTokens = this.preprocessMixedNumbers(tokens);

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
          if (den?.type !== "NUMBER" && den?.type !== "IDENTIFIER")
            throw new Error("Expected denominator");
          // Allow variable in denominator for patterns like 1/a
          if (den.type === "IDENTIFIER") {
            return {
              type: "fraction",
              numerator: token.value,
              denominator: den.value,
            };
          }
          return {
            type: "fraction",
            numerator: token.value,
            denominator: den.value,
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
            if (den?.type !== "NUMBER" && den?.type !== "IDENTIFIER")
              throw new Error("Expected denominator");
            return {
              type: "fraction",
              numerator: `-${next.value}`,
              denominator: den.value,
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
      if (token.type === ("MIXED" as any)) {
        consume();
        const parts = token.value.split("_"); // Hacky encoding
        return {
          type: "mixed",
          whole: parts[0],
          numerator: parts[1],
          denominator: parts[2],
        };
      }

      if (token.type === "COMMAND") {
        consume();
        if (token.value === "left") {
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
          throw new Error(`Unsupported delimiter after \\left: ${next?.value}`);
        }
        if (token.value === "frac") {
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

          // Check if simple fraction
          const isSimple =
            (num.type === "integer" || num.type === "variable") &&
            (den.type === "integer" || den.type === "variable");

          if (isSimple) {
            let simpleNum = "";
            let simpleDen = "";
            if (num.type === "integer") simpleNum = num.value;
            else if (num.type === "variable") simpleNum = num.name;

            if (den.type === "integer") simpleDen = den.value;
            else if (den.type === "variable") simpleDen = den.name;

            return {
              type: "fraction",
              numerator: simpleNum,
              denominator: simpleDen,
            };
          } else {
            return {
              type: "binaryOp",
              op: "/",
              left: num,
              right: den,
            };
          }
        }
        throw new Error(`Unknown command: \\${token.value}`);
      }

      throw new Error(`Unexpected token: ${token.value}`);
    }

    function parseMulDiv(): AstNode {
      let left = parsePrimary();

      while (true) {
        const token = peek();
        if (!token) break;

        // Handle standard * and / and :
        if (token.value === "*" || token.value === "/" || token.type === "COLON") {
          const opToken = consume()!;
          let opValue = opToken.value;

          // Normalize division tokens to "\div"
          if (opToken.type === "COLON" || opValue === "/") {
            opValue = "\\div";
          }

          const right = parsePrimary();
          left = {
            type: "binaryOp",
            op: opValue as any,
            left,
            right,
          };
          continue;
        }

        // Handle \div command
        if (token.type === "COMMAND" && token.value === "div") {
          consume(); // \div
          const right = parsePrimary();
          left = {
            type: "binaryOp",
            op: "\\div",
            left,
            right,
          };
          continue;
        }

        // Handle \cdot and \times commands -> map to "*"
        if (token.type === "COMMAND" && (token.value === "cdot" || token.value === "times")) {
          consume(); // \cdot or \times
          const right = parsePrimary();
          left = {
            type: "binaryOp",
            op: "*",
            left,
            right,
          };
          continue;
        }

        break;
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
          right,
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

  tokenize(input: string): Token[] {
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
        tokens.push({ type: "SLASH", value: "/", pos: i });
        i++;
        continue;
      }

      if (char === ":") {
        tokens.push({ type: "COLON", value: ":", pos: i });
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

  preprocessMixedNumbers(tokens: Token[]): Token[] {
    const result: Token[] = [];
    let i = 0;

    while (i < tokens.length) {
      const t = tokens[i];

      // Check for Mixed Number: Num, Space, Num, Slash, Num
      if (t.type === "NUMBER") {
        const t1 = tokens[i + 1];
        const t2 = tokens[i + 2];
        const t3 = tokens[i + 3];
        const t4 = tokens[i + 4];

        if (
          t1?.type === "SPACE" &&
          t2?.type === "NUMBER" &&
          t3?.type === "SLASH" &&
          t4?.type === "NUMBER"
        ) {
          // Found mixed number!
          result.push({
            type: "MIXED" as any,
            value: `${t.value}_${t2.value}_${t4.value}`,
            pos: t.pos,
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
}

/**
 * Standalone function for backward compatibility
 */
export function parseExpression(latex: string): AstNode | undefined {
  return container.resolve(AstParser).parse(latex);
}
