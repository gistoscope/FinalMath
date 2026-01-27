import { inject, singleton } from "tsyringe";
import { Tokens } from "../../../di/tokens";
import type { AstNode } from "../models/AstNode";
import type { IParser } from "./IParser";
import type { ITokenizer, Token } from "./ITokenizer";
import { TokenType } from "./ITokenizer";

/**
 * Parser for LaTeX arithmetic expressions.
 * Implements a recursive descent parser.
 */
@singleton()
export class Parser implements IParser {
  private tokens: Token[] = [];
  private pos: number = 0;
  private tokenizer: ITokenizer;

  constructor(@inject(Tokens.ITokenizer) tokenizer: ITokenizer) {
    this.tokenizer = tokenizer;
  }

  public parse(latex: string): AstNode | null {
    if (!latex || typeof latex !== "string") return null;

    this.tokens = this.tokenizer.tokenize(latex);
    this.pos = 0;

    if (!this.tokens || this.tokens.length === 0) {
      return null;
    }

    try {
      return this._parseAddSub();
    } catch (e) {
      console.error("[AST Parser] Parse error:", e);
      return null;
    }
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token | undefined {
    return this.tokens[this.pos++];
  }

  private _parseAddSub(): AstNode | null {
    let left = this._parseMulDiv();

    while (this.peek() && this._isAddSub(this.peek()!.value)) {
      const opToken = this.consume()!;
      const right = this._parseMulDiv();
      if (left && right) {
        left = {
          type: "binaryOp",
          op: this._normalizeOp(opToken.value),
          left,
          right,
        };
      }
    }

    return left;
  }

  private _parseMulDiv(): AstNode | null {
    let left = this._parsePrimary();

    while (this.peek() && this._isMulDiv(this.peek()!.value)) {
      const opToken = this.consume()!;
      const right = this._parsePrimary();
      if (left && right) {
        left = {
          type: "binaryOp",
          op: this._normalizeOp(opToken.value),
          left,
          right,
        };
      }
    }

    return left;
  }

  private _parsePrimary(): AstNode | null {
    const token = this.peek();
    if (!token) return null;

    if (token.type === TokenType.NUMBER) {
      this.consume();
      return { type: "integer", value: token.value };
    }

    if (token.type === TokenType.LPAREN) {
      this.consume();
      const node = this._parseAddSub();
      if (this.peek() && this.peek()!.type === TokenType.RPAREN) {
        this.consume();
      }
      return node;
    }

    if (token.value === "-" || token.value === "−") {
      this.consume();
      const next = this._parsePrimary();

      if (next && next.type === "integer") {
        next.value = "-" + next.value;
        return next;
      }

      return { type: "unaryOp", op: "-", arg: next || undefined };
    }

    if (token.type === TokenType.FRAC) {
      this.consume();
      const num = this._parseGroup();
      const den = this._parseGroup();
      if (num && den) {
        return { type: "fraction", args: [num, den] };
      }
    }

    return null;
  }

  private _parseGroup(): AstNode | null {
    if (this.peek() && this.peek()!.type === TokenType.LBRACE) {
      this.consume();
      const node = this._parseAddSub();
      if (this.peek() && this.peek()!.type === TokenType.RBRACE) {
        this.consume();
      }
      return node;
    }
    return this._parsePrimary();
  }

  private _isAddSub(op: string): boolean {
    return ["+", "-", "−"].includes(op);
  }

  private _isMulDiv(op: string): boolean {
    return ["*", "×", "·", "⋅", "∗", "/", ":", "÷"].includes(op);
  }

  private _normalizeOp(op: string): string {
    if (op === "−") return "-";
    if (["×", "·", "⋅", "∗"].includes(op)) return "*";
    if (["÷", ":"].includes(op)) return "/";
    return op;
  }
}
