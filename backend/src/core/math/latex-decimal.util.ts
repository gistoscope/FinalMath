/**
 * LaTeX Fraction to Decimal Converter Utility
 *
 * Handles the preprocessing of LaTeX strings to convert standard fraction patterns
 * into their decimal equivalents based on context or precision.
 */

/**
 * Preprocess a LaTeX expression to convert fractions to decimals.
 *
 * Rules:
 * 1. Identifies `\frac{num}{den}` patterns.
 * 2. Converts only if:
 *    - The expression already contains a decimal point elsewhere.
 *    - OR the division results in a clean (terminating) decimal.
 * 3. Handles floating-point precision to avoid artifacts.
 *
 * @param expression The LaTeX expression string
 * @returns The expression with valid fractions replaced by decimals
 */
export const preprocessLatexFractions = (expression: string): string => {
  // Regex to match \frac{num}{den}
  // Handles potential whitespace, negative numbers, and existing decimals in numerator/denominator
  // Capture groups: 1 = numerator, 2 = denominator
  const fractionRegex = /\\frac\s*\{\s*(-?\d+(?:\.\d+)?)\s*\}\s*\{\s*(-?\d+(?:\.\d+)?)\s*\}/g;

  // Check if strict conversion is needed based on existing decimals in the string.
  // Note: We check the original expression. If the expression contains a decimal point
  // (e.g., "1.5 + ..."), we assume the user wants a decimal result for all parts.
  const hasDecimalContext = expression.includes(".");

  return expression.replace(fractionRegex, (match, numStr, denStr) => {
    const num = parseFloat(numStr);
    const den = parseFloat(denStr);

    if (den === 0) {
      return match; // Division by zero is undefined, keep original LaTeX
    }

    const quotient = num / den;

    // Determine if the result is a "clean" decimal.
    // A clean decimal matches its fixed-point representation with a reasonable precision
    // without loss of information (e.g., 0.5 vs 0.333333...).
    // We check this by seeing if the number of decimal places is small.
    // For this utility, we considering "clean" if it has <= 6 significant decimal places equivalent.

    // Strategy: Format to a high precision, parse back to remove trailing zeros,
    // and check the string length or value equality.
    const precisionCheck = parseFloat(quotient.toFixed(10));

    // A simplified check for "clean":
    // If the number, when multiplied by a power of 10, becomes an integer.
    // We limit "clean" to mean 4-5 decimal places for typical math usage.
    const isClean = Math.abs(quotient * 10000 - Math.round(quotient * 10000)) < Number.EPSILON;

    if (hasDecimalContext || isClean) {
      // Use parseFloat + toFixed to handle precision artifacts (e.g. 0.1 + 0.2 = 0.30000000000000004)
      // 6 decimal places is a safe default for "decimal mode".
      return parseFloat(quotient.toFixed(6)).toString();
    }

    // If neither condition is met, return the original match (keep as fraction)
    return match;
  });
};

/**
 * Explanation of Regex Strategy for Nested Braces:
 *
 * The regex used is: /\\frac\s*\{\s*(-?\d+(?:\.\d+)?)\s*\}\s*\{\s*(-?\d+(?:\.\d+)?)\s*\}/g
 *
 * 1. Targeted Matching: This regex specifically targets "simple" usage where the numerator
 *    and denominator are purely numeric (integers or decimals).
 *    It uses `[\d.-]+` patterns rather than generic `.` or `[^}]` patterns.
 *
 * 2. Nested Structures: The regex only matches explicit numeric fractions `\frac{a}{b}`.
 *    In a nested structure like `\frac{\frac{1}{2}}{3}`, the outer fraction is initially skipped
 *    (as its numerator `\frac{1}{2}` is not a number). However, the inner `\frac{1}{2}` IS matched
 *    and converted if valid. This creates a partially simplified string like `\frac{0.5}{3}`,
 *    which is often easier for downstream parsers to handle. this strategy effectively resolves
 *    innermost numeric fractions without requiring a recursive parser.
 *
 * 3. Performance: This avoids catastrophic backtracking and recursion, keeping the replacement
 *    pass extremely fast (O(n)).
 */
