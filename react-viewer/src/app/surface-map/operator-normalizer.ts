/**
 * @fileoverview Operator symbol normalization
 */

/**
 * Class for normalizing operator symbols.
 */
export class OperatorNormalizer {
  /**
   * Maps various Unicode operator glyphs to canonical ASCII operators.
   * @param {string} ch - The character or string to normalize
   * @returns {string} Normalized operator or original string
   */
  static normalize(ch: string): string {
    const s = (ch || "").trim();

    // Multiplication: *, × (U+00D7), · (U+00B7), ⋅ (U+22C5), ∗ (U+2217)
    if (s === "*" || s === "×" || s === "·" || s === "⋅" || s === "∗") {
      return "*";
    }

    // Subtraction: -, − (U+2212)
    if (s === "-" || s === "−") {
      return "-";
    }

    // Division: /, ÷ (U+00F7), : (ASCII colon)
    if (s === "/" || s === "÷" || s === ":") {
      return "/";
    }

    // Addition: +
    if (s === "+") {
      return "+";
    }

    return s;
  }
}
