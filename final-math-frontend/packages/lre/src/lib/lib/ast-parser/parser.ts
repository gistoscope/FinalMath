/**
 * Parser.ts
 * Recursive descent parser for LaTeX arithmetic expressions.
 */

import { Tokenizer } from './tokenizer';
import {
  AstNode,
  BinaryOpNode,
  FractionNode,
  IntegerNode,
  MixedNode,
  Token,
  TokenType,
  UnaryOpNode,
} from './types';

/**
 * Parser for LaTeX arithmetic expressions.
 * Uses recursive descent parsing with standard operator precedence.
 * Expression hierarchy: AddSub > MulDiv > Primary
 */
export class Parser {
  private pos: number;
  private tokens: Token[];

  /**
   * @param tokens - Tokens from Tokenizer
   */
  constructor(tokens: Token[] | null) {
    this.tokens = tokens || [];
    this.pos = 0;
  }

  /**
   * Peek at the current token without consuming it.
   * @returns Current token or undefined
   */
  peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  /**
   * Consume and return the current token.
   * @returns Consumed token or undefined
   */
  consume(): Token | undefined {
    return this.tokens[this.pos++];
  }

  /**
   * Parse the token stream into an AST.
   * @returns AST root node or null if parsing fails
   */
  parse(): AstNode | null {
    if (!this.tokens || this.tokens.length === 0) {
      return null;
    }

    try {
      return this._parseAddSub();
    } catch (e) {
      console.error('[AST Parser] Parse error:', e);
      return null;
    }
  }

  /**
   * Parse addition and subtraction (lowest precedence).
   * @returns AST node
   */
  private _parseAddSub(): AstNode | null {
    let left = this._parseMulDiv();

    while (this.peek() && this._isAddSub(this.peek()!.value)) {
      const opToken = this.consume();
      const right = this._parseMulDiv();

      if (!left || !right || !opToken) return null; // Safety check

      const binaryNode: BinaryOpNode = {
        type: 'binaryOp',
        op: this._normalizeOp(opToken.value),
        left,
        right,
      };
      left = binaryNode;
    }

    return left;
  }

  /**
   * Parse multiplication and division (higher precedence).
   * @returns AST node
   */
  private _parseMulDiv(): AstNode | null {
    let left = this._parsePrimary();

    while (this.peek() && this._isMulDiv(this.peek()!.value)) {
      const opToken = this.consume();
      const right = this._parsePrimary();

      if (!left || !right || !opToken) return null; // Safety check

      const binaryNode: BinaryOpNode = {
        type: 'binaryOp',
        op: this._normalizeOp(opToken.value),
        left,
        right,
      };
      left = binaryNode;
    }

    return left;
  }

  /**
   * Parse primary expressions (numbers, parentheses, unary, fractions).
   * @returns AST node
   */
  private _parsePrimary(): AstNode | null {
    const token = this.peek();
    if (!token) return null;

    // Mixed Number
    if (token.type === TokenType.MIXED) {
      this.consume();
      console.log('mixed token', token);
      const parts = token.value.split('_');
      return {
        type: 'mixed',
        whole: parts[0],
        numerator: parts[1],
        denominator: parts[2],
      } as MixedNode;
    }

    // Number
    if (token.type === TokenType.NUMBER) {
      this.consume();

      // Check for Mixed Number pattern: Integer followed immediately by \frac
      if (this.peek()?.type === TokenType.FRAC) {
        this.consume(); // consume \frac
        const num = this._parseGroup();
        const den = this._parseGroup();

        if (num && den && num.type === 'integer' && den.type === 'integer') {
          return {
            type: 'mixed',
            whole: token.value,
            numerator: (num as IntegerNode).value,
            denominator: (den as IntegerNode).value,
          } as MixedNode;
        }
        // Fallback for non-integer mixed components (unlikely in this context, but safer to error or handle)
        // For now, if not integers, we can throw or return a Fraction with implicit multiplication.
        // Given constraints, assuming valid integer mixed numbers.
      }

      return { type: 'integer', value: token.value } as IntegerNode;
    }

    // Parentheses
    if (token.type === TokenType.LPAREN) {
      this.consume();
      const node = this._parseAddSub();
      if (this.peek() && this.peek()!.type === TokenType.RPAREN) {
        this.consume();
      }
      return node;
    }

    // Unary minus
    if (token.value === '-' || token.value === '−') {
      this.consume();
      const next = this._parsePrimary();

      // Treat negative constant as constant
      if (next && next.type === 'integer') {
        const intNode = next as IntegerNode;
        intNode.value = '-' + intNode.value;
        return intNode;
      }

      if (!next) return null;

      // Complex unary expression
      return { type: 'unaryOp', op: '-', arg: next } as UnaryOpNode;
    }

    // Fractions
    if (token.type === TokenType.FRAC) {
      this.consume();
      const num = this._parseGroup();
      const den = this._parseGroup();

      if (!num || !den) return null;

      return { type: 'fraction', args: [num, den] } as FractionNode;
    }

    return null;
  }

  /**
   * Parse a braced group { ... } or single token.
   * @returns AST node
   */
  private _parseGroup(): AstNode | null {
    if (this.peek() && this.peek()!.type === TokenType.LBRACE) {
      this.consume();
      const node = this._parseAddSub();
      if (this.peek() && this.peek()!.type === TokenType.RBRACE) {
        this.consume();
      }
      return node;
    }
    // Fallback: single token (e.g., \frac 1 2)
    return this._parsePrimary();
  }

  /**
   * Check if operator is addition or subtraction.
   * @param op - Operator character
   * @returns boolean
   */
  private _isAddSub(op: string): boolean {
    return ['+', '-', '−'].includes(op);
  }

  /**
   * Check if operator is multiplication or division.
   * @param op - Operator character
   * @returns boolean
   */
  private _isMulDiv(op: string): boolean {
    return ['*', '×', '·', '⋅', '∗', '/', ':', '÷'].includes(op);
  }

  /**
   * Normalize operator characters to standard form.
   * @param op - Operator character
   * @returns Normalized operator
   */
  private _normalizeOp(op: string): string {
    if (op === '−') return '-';
    if (['×', '·', '⋅', '∗'].includes(op)) return '*';
    if (['÷', ':'].includes(op)) return '/';
    return op;
  }

  /**
   * Preprocess tokens to identify mixed numbers.
   * Also filters out whitespace tokens that are not part of a mixed number.
   * @param tokens - Raw tokens
   * @returns Processed tokens
   */
  static preprocessMixedNumbers(tokens: Token[]): Token[] {
    const result: Token[] = [];
    let i = 0;

    while (i < tokens.length) {
      const t = tokens[i];

      // Check for Mixed Number: Num, Space, Num, Slash, Num
      if (t.type === TokenType.NUMBER) {
        const t1 = tokens[i + 1];
        const t2 = tokens[i + 2];
        const t3 = tokens[i + 3];
        const t4 = tokens[i + 4];

        if (
          t1?.type === TokenType.SPACE &&
          t2?.type === TokenType.NUMBER &&
          t3?.type === TokenType.OP &&
          t3.value === '/' &&
          t4?.type === TokenType.NUMBER
        ) {
          // Found mixed number!
          result.push({
            type: TokenType.MIXED,
            value: `${t.value}_${t2.value}_${t4.value}`,
          });
          i += 5;
          continue;
        }
      }

      // Filter out spaces if not part of mixed number
      if (t.type !== TokenType.SPACE) {
        result.push(t);
      }
      i++;
    }

    return result;
  }

  /**
   * Static helper to parse a LaTeX string directly.
   * @param latex - LaTeX expression string
   * @returns AST root node or null if parsing fails
   */
  static parse(latex: string): AstNode | null {
    if (!latex || typeof latex !== 'string') return null;

    let tokens = Tokenizer.tokenize(latex);
    if (!tokens || tokens.length === 0) return null;

    tokens = Parser.preprocessMixedNumbers(tokens);

    return new Parser(tokens).parse();
  }
}
