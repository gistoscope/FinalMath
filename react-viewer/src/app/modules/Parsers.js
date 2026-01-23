/**
 * Parsers.js
 * pure logic module for string parsing and data classification.
 */

export class Parsers {
  /**
   * Check if text contains a digit.
   * @param {string} text
   * @returns {boolean}
   */
  static hasDigit(text) {
    return /[0-9]/.test(text || "");
  }

  /**
   * Check if text is a decimal number.
   * @param {string} text
   * @returns {boolean}
   */
  static isDecimal(text) {
    return /^\d+\.\d+$/.test((text || "").trim());
  }

  /**
   * Check if text contains Greek characters.
   * @param {string} text
   * @returns {boolean}
   */
  static hasGreekChar(text) {
    return /[\u0370-\u03FF\u1F00-\u1FFF]/.test((text || "").trim());
  }

  /**
   * Check if text contains an ASCII letter.
   * @param {string} text
   * @returns {boolean}
   */
  static hasAsciiLetter(text) {
    return /[A-Za-z]/.test(text || "");
  }

  /**
   * Normalize operator symbols to standard forms.
   * @param {string} op
   * @returns {string}
   */
  static normalizeOperator(op) {
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
