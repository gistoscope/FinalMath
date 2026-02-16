/**
 * LaTeX Preprocessor Utility
 *
 * Handles two-stage preprocessing of LaTeX strings:
 * 1. Mixed Numbers to Improper Fractions (Always)
 * 2. Fractions to Decimals (Conditional on Decimal Context)
 */

export interface PreprocessResult {
  latex: string;
  appliedTransformations: string[];
}

/**
 * Main Preprocessor Function
 * Pipelines the LaTeX through multiple stages.
 */
export const preprocessLatex = (expression: string): PreprocessResult => {
  const applied: string[] = [];

  // Stage 1: Mixed -> Improper (Mandatory)
  const afterStage1 = convertMixedToImproper(expression);
  if (afterStage1 !== expression) {
    applied.push("P.FRAC_MIXED_TO_IMPROPER");
  }

  // Stage 2: Fraction -> Decimal (Conditional)
  // We check the *original* (or current) string for decimal context.
  // The requirement says: "If a decimal is present (e.g. 1.2 + \frac{5}{3})..."
  // This means if the user typed "1.2 + 1\frac{2}{3}", stage 1 makes it "1.2 + \frac{5}{3}".
  // Then stage 2 sees "1.2" and converts "\frac{5}{3}" to "1.6667".
  const afterStage2 = convertFractionsToDecimals(afterStage1);
  if (afterStage2 !== afterStage1) {
    applied.push("P.FRAC_TO_DECIMAL");
  }

  return {
    latex: afterStage2,
    appliedTransformations: applied,
  };
};

/**
 * Stage 1: Convert Mixed Numbers to Improper Fractions
 * Pattern: Whole \frac{Num}{Den} -> \frac{Whole * Den + Num}{Den}
 */
const convertMixedToImproper = (expression: string): string => {
  // Regex Explanation:
  // (\d+)       -> Capture Group 1: Whole Number (Integer)
  // \s*         -> Optional whitespace
  // \\frac      -> Literal \frac
  // \s*\{\s*    -> Open brace with whitespace
  // (\d+)       -> Capture Group 2: Numerator (Integer)
  // \s*\}\s*\{\s* -> Middle braces with whitespace
  // (\d+)       -> Capture Group 3: Denominator (Integer)
  // \s*\}       -> Close brace
  const mixedRegex = /(\d+)\s*\\frac\s*\{\s*(\d+)\s*\}\s*\{\s*(\d+)\s*\}/g;

  return expression.replace(mixedRegex, (match, wholeStr, numStr, denStr) => {
    const whole = parseInt(wholeStr, 10);
    const num = parseInt(numStr, 10);
    const den = parseInt(denStr, 10);

    if (isNaN(whole) || isNaN(num) || isNaN(den) || den === 0) {
      return match; // Safety fallback
    }

    const newNum = whole * den + num;
    return `\\frac{${newNum}}{${den}}`;
  });
};

/**
 * Stage 2: Convert Fractions to Decimals if Context Exists
 * Reuses previous logic but strictly conditional.
 */
const convertFractionsToDecimals = (expression: string): string => {
  // Check context on the current expression state
  const hasDecimalContext = expression.includes(".");
  if (!hasDecimalContext) {
    return expression;
  }

  // Regex for fractions (integers or decimals)
  const fractionRegex = /\\frac\s*\{\s*(-?\d+(?:\.\d+)?)\s*\}\s*\{\s*(-?\d+(?:\.\d+)?)\s*\}/g;

  return expression.replace(fractionRegex, (match, numStr, denStr) => {
    const num = parseFloat(numStr);
    const den = parseFloat(denStr);

    if (den === 0) return match;

    const quotient = num / den;

    // Use toFixed(6) to handle precision artifacts, then parseFloat to trim trailing zeros.
    return parseFloat(quotient.toFixed(6)).toString();
  });
};

// Re-export old function name for compatibility if needed, but bridged to new logic
// Deprecated: prefer preprocessLatex
export const preprocessLatexFractions = (expression: string): string => {
  return preprocessLatex(expression).latex;
};
