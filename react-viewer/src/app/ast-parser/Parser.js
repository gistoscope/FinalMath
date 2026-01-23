/**
 * Parser.js
 * Recursive descent parser for LaTeX arithmetic expressions.
 */

import { Tokenizer, TokenType } from "./Tokenizer.js";

/**
 * Parser for LaTeX arithmetic expressions.
 * Uses recursive descent parsing with standard operator precedence.
 * Expression hierarchy: AddSub > MulDiv > Primary
 */
export class Parser {
  /**
   * @param {Array<{type: string, value: string}>} tokens - Tokens from Tokenizer
   */
  constructor(tokens) {
    this.tokens = tokens || [];
    this.pos = 0;
  }

  /**
   * Peek at the current token without consuming it.
   * @returns {{type: string, value: string}|undefined} Current token or undefined
   */
  peek() {
    return this.tokens[this.pos];
  }

  /**
   * Consume and return the current token.
   * @returns {{type: string, value: string}|undefined} Consumed token or undefined
   */
  consume() {
    return this.tokens[this.pos++];
  }

  /**
   * Parse the token stream into an AST.
   * @returns {Object|null} AST root node or null if parsing fails
   */
  parse() {
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

  /**
   * Parse addition and subtraction (lowest precedence).
   * @returns {Object|null} AST node
   * @private
   */
  _parseAddSub() {
    let left = this._parseMulDiv();

    while (this.peek() && this._isAddSub(this.peek().value)) {
      const opToken = this.consume();
      const right = this._parseMulDiv();
      left = {
        type: "binaryOp",
        op: this._normalizeOp(opToken.value),
        left,
        right,
      };
    }

    return left;
  }

  /**
   * Parse multiplication and division (higher precedence).
   * @returns {Object|null} AST node
   * @private
   */
  _parseMulDiv() {
    let left = this._parsePrimary();

    while (this.peek() && this._isMulDiv(this.peek().value)) {
      const opToken = this.consume();
      const right = this._parsePrimary();
      left = {
        type: "binaryOp",
        op: this._normalizeOp(opToken.value),
        left,
        right,
      };
    }

    return left;
  }

  /**
   * Parse primary expressions (numbers, parentheses, unary, fractions).
   * @returns {Object|null} AST node
   * @private
   */
  _parsePrimary() {
    const token = this.peek();
    if (!token) return null;

    // Number
    if (token.type === TokenType.NUMBER) {
      this.consume();
      return { type: "integer", value: token.value };
    }

    // Parentheses
    if (token.type === TokenType.LPAREN) {
      this.consume();
      const node = this._parseAddSub();
      if (this.peek() && this.peek().type === TokenType.RPAREN) {
        this.consume();
      }
      return node;
    }

    // Unary minus
    if (token.value === "-" || token.value === "−") {
      this.consume();
      const next = this._parsePrimary();

      // Treat negative constant as constant
      if (next && next.type === "integer") {
        next.value = "-" + next.value;
        return next;
      }

      // Complex unary expression
      return { type: "unaryOp", op: "-", arg: next };
    }

    // Fractions
    if (token.type === TokenType.FRAC) {
      this.consume();
      const num = this._parseGroup();
      const den = this._parseGroup();
      return { type: "fraction", args: [num, den] };
    }

    return null;
  }

  /**
   * Parse a braced group { ... } or single token.
   * @returns {Object|null} AST node
   * @private
   */
  _parseGroup() {
    if (this.peek() && this.peek().type === TokenType.LBRACE) {
      this.consume();
      const node = this._parseAddSub();
      if (this.peek() && this.peek().type === TokenType.RBRACE) {
        this.consume();
      }
      return node;
    }
    // Fallback: single token (e.g., \frac 1 2)
    return this._parsePrimary();
  }

  /**
   * Check if operator is addition or subtraction.
   * @param {string} op - Operator character
   * @returns {boolean}
   * @private
   */
  _isAddSub(op) {
    return ["+", "-", "−"].includes(op);
  }

  /**
   * Check if operator is multiplication or division.
   * @param {string} op - Operator character
   * @returns {boolean}
   * @private
   */
  _isMulDiv(op) {
    return ["*", "×", "·", "⋅", "∗", "/", ":", "÷"].includes(op);
  }

  /**
   * Normalize operator characters to standard form.
   * @param {string} op - Operator character
   * @returns {string} Normalized operator
   * @private
   */
  _normalizeOp(op) {
    if (op === "−") return "-";
    if (["×", "·", "⋅", "∗"].includes(op)) return "*";
    if (["÷", ":"].includes(op)) return "/";
    return op;
  }

  /**
   * Static helper to parse a LaTeX string directly.
   * @param {string} latex - LaTeX expression string
   * @returns {Object|null} AST root node or null if parsing fails
   */
  static parse(latex) {
    if (!latex || typeof latex !== "string") return null;

    const tokens = Tokenizer.tokenize(latex);
    if (!tokens || tokens.length === 0) return null;

    return new Parser(tokens).parse();
  }
}
