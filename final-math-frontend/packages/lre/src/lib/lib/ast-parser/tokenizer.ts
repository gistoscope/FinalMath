/**
 * Tokenizer.ts
 * Handles tokenization of LaTeX arithmetic expressions.
 */

import { Token, TokenType } from './types';

/**
 * Tokenizer for LaTeX arithmetic expressions.
 * Handles: numbers, decimals, +, -, *, /, brackets, \frac, \cdot, \times, etc.
 */
export class Tokenizer {
  private pos = 0;
  private tokens: Token[] = [];

  constructor(private readonly input = '') {}

  /**
   * Tokenize the input string.
   * @returns Array of tokens
   */
  tokenize(): Token[] {
    this.tokens = [];
    this.pos = 0;

    while (this.pos < this.input.length) {
      const char = this.input[this.pos];

      // Whitespace
      if (/\s/.test(char)) {
        this.tokens.push({ type: TokenType.SPACE, value: char });
        this.pos++;
        continue;
      }

      // Numbers
      if (/\d/.test(char)) {
        this._readNumber();
        continue;
      }

      // LaTeX commands (macros)
      if (char === '\\') {
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

  /**
   * Read a number token (including decimals).
   */
  private _readNumber(): void {
    let value = this.input[this.pos];
    this.pos++;

    while (
      this.pos < this.input.length &&
      (/\d/.test(this.input[this.pos]) || this.input[this.pos] === '.')
    ) {
      value += this.input[this.pos];
      this.pos++;
    }

    this.tokens.push({ type: TokenType.NUMBER, value });
  }

  /**
   * Read a LaTeX command (macro).
   */
  private _readCommand(): void {
    let cmd = '\\';
    this.pos++;

    while (
      this.pos < this.input.length &&
      /[a-zA-Z]/.test(this.input[this.pos])
    ) {
      cmd += this.input[this.pos];
      this.pos++;
    }

    if (cmd === '\\frac') {
      this.tokens.push({ type: TokenType.FRAC, value: '\\frac' });
    } else if (cmd === '\\cdot' || cmd === '\\times') {
      this.tokens.push({ type: TokenType.OP, value: '*' });
    } else if (cmd === '\\div') {
      this.tokens.push({ type: TokenType.OP, value: '/' });
    } else if (cmd === '\\left' || cmd === '\\right') {
      // Ignore sizing commands - let the next char be the token
      return;
    }
    // Unknown commands are silently ignored
  }

  /**
   * Try to read a bracket token.
   * @param char - Current character
   * @returns True if bracket was read
   */
  private _readBracket(char: string): boolean {
    if (char === '(' || char === '[') {
      this.tokens.push({ type: TokenType.LPAREN, value: '(' });
      this.pos++;
      return true;
    }
    if (char === ')' || char === ']') {
      this.tokens.push({ type: TokenType.RPAREN, value: ')' });
      this.pos++;
      return true;
    }
    if (char === '{') {
      this.tokens.push({ type: TokenType.LBRACE, value: '{' });
      this.pos++;
      return true;
    }
    if (char === '}') {
      this.tokens.push({ type: TokenType.RBRACE, value: '}' });
      this.pos++;
      return true;
    }
    return false;
  }

  /**
   * Try to read an operator token.
   * @param char - Current character
   * @returns True if operator was read
   */
  private _readOperator(char: string): boolean {
    if ('+-−*×·⋅∗/:'.includes(char)) {
      this.tokens.push({ type: TokenType.OP, value: char });
      this.pos++;
      return true;
    }
    return false;
  }

  /**
   * Static helper to tokenize a string directly.
   * @param input - LaTeX expression string
   * @returns Array of tokens
   */
  static tokenize(input: string): Token[] {
    return new Tokenizer(input).tokenize();
  }
}
