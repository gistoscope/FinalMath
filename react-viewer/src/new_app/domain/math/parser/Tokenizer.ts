import { singleton } from "tsyringe";
import type { ITokenizer, Token } from "./ITokenizer";
import { TokenType } from "./ITokenizer";

/**
 * Tokenizer for LaTeX arithmetic expressions.
 * Implements ITokenizer as a singleton service.
 */
@singleton()
export class Tokenizer implements ITokenizer {
  private input: string = "";
  private pos: number = 0;
  private tokens: Token[] = [];

  public tokenize(input: string): Token[] {
    this.input = input || "";
    this.pos = 0;
    this.tokens = [];

    while (this.pos < this.input.length) {
      const char = this.input[this.pos];

      // Skip whitespace
      if (/\s/.test(char)) {
        this.pos++;
        continue;
      }

      // Numbers
      if (/\d/.test(char)) {
        this._readNumber();
        continue;
      }

      // LaTeX commands (macros)
      if (char === "\\") {
        this._readCommand();
        continue;
      }

      // Brackets
      if (this._readBracket(char)) {
        continue;
      }

      // Operators
      if (this._readOperator(char)) {
        continue;
      }

      // Unknown character, skip
      this.pos++;
    }

    return this.tokens;
  }

  private _readNumber() {
    let value = this.input[this.pos];
    this.pos++;

    while (
      this.pos < this.input.length &&
      (/\d/.test(this.input[this.pos]) || this.input[this.pos] === ".")
    ) {
      value += this.input[this.pos];
      this.pos++;
    }

    this.tokens.push({ type: TokenType.NUMBER, value });
  }

  private _readCommand() {
    let cmd = "\\";
    this.pos++;

    while (
      this.pos < this.input.length &&
      /[a-zA-Z]/.test(this.input[this.pos])
    ) {
      cmd += this.input[this.pos];
      this.pos++;
    }

    if (cmd === "\\frac") {
      this.tokens.push({ type: TokenType.FRAC, value: "\\frac" });
    } else if (cmd === "\\cdot" || cmd === "\\times") {
      this.tokens.push({ type: TokenType.OP, value: "*" });
    } else if (cmd === "\\div") {
      this.tokens.push({ type: TokenType.OP, value: "/" });
    } else if (cmd === "\\left" || cmd === "\\right") {
      return;
    }
  }

  private _readBracket(char: string): boolean {
    if (char === "(" || char === "[") {
      this.tokens.push({ type: TokenType.LPAREN, value: "(" });
      this.pos++;
      return true;
    }
    if (char === ")" || char === "]") {
      this.tokens.push({ type: TokenType.RPAREN, value: ")" });
      this.pos++;
      return true;
    }
    if (char === "{") {
      this.tokens.push({ type: TokenType.LBRACE, value: "{" });
      this.pos++;
      return true;
    }
    if (char === "}") {
      this.tokens.push({ type: TokenType.RBRACE, value: "}" });
      this.pos++;
      return true;
    }
    return false;
  }

  private _readOperator(char: string): boolean {
    if ("+-−*×·⋅∗/:".includes(char)) {
      this.tokens.push({ type: TokenType.OP, value: char });
      this.pos++;
      return true;
    }
    return false;
  }
}
