/**
 * Parsers.ts
 * pure logic module for string parsing and data classification.
 */

export class Parsers {
  /**
   * Check if text contains a digit.
   */
  static hasDigit(text: string): boolean {
    return /[0-9]/.test(text || "");
  }

  /**
   * Check if text is a decimal number.
   */
  static isDecimal(text: string): boolean {
    return /^\d+\.\d+$/.test((text || "").trim());
  }

  /**
   * Check if text contains Greek characters.
   */
  static hasGreekChar(text: string): boolean {
    return /[\u0370-\u03FF\u1F00-\u1FFF]/.test((text || "").trim());
  }

  /**
   * Check if text contains an ASCII letter.
   */
  static hasAsciiLetter(text: string): boolean {
    return /[A-Za-z]/.test(text || "");
  }

  /**
   * Normalize operator symbols to standard forms.
   */
  static normalizeOperator(op: string): string {
    const s = (op || "").trim();

    // Multiplication
    if (["*", "×", "·", "⋅", "∗"].includes(s)) return "*";

    // Subtraction
    if (["-", "−"].includes(s)) return "-";

    // Division
    if (["/", "÷", ":"].includes(s)) return "/";

    // Addition
    if (s === "+") return "+";

    return s;
  }
}
