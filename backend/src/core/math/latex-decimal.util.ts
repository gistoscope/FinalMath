/**
 * LaTeX Preprocessor Utility (Recursive Descent)
 *
 * Handles deep preprocessing of LaTeX strings with priority:
 * 1. Innermost structures first (Deep-to-Front).
 * 2. Mixed Numbers -> Improper Fractions (Mandatory).
 * 3. Fractions -> Decimals (Conditional on global decimal context).
 */

export interface PreprocessResult {
  latex: string;
  appliedTransformations: string[];
}

export const preprocessLatex = (expression: string): PreprocessResult => {
  const processor = new LatexRecursiveProcessor(expression);
  const result = processor.process();
  return {
    latex: result,
    appliedTransformations: Array.from(processor.transformations),
  };
};

/**
 * Recursive Processor Class
 * Maintains state and handles the recursive parsing.
 */
class LatexRecursiveProcessor {
  private readonly input: string;
  private readonly hasDecimalContext: boolean;
  public transformations: Set<string> = new Set();

  constructor(input: string) {
    this.input = input;
    // Global context check (Stage 2 Requirement)
    this.hasDecimalContext = input.includes(".");
  }

  public process(): string {
    return this.parseBlock(this.input);
  }

  /**
   * Recursively parses a block of text.
   * - Scans left-to-right.
   * - Recurses into braces `{...}`.
   * - Identifies and handles `\frac`.
   */
  private parseBlock(text: string): string {
    let cursor = 0;
    let buffer = "";

    while (cursor < text.length) {
      const char = text[cursor];

      // Check for command start
      if (char === "\\") {
        // Look ahead for "frac"
        if (text.startsWith("frac", cursor + 1)) {
          // Found \frac.
          // 1. Parse arguments
          const arg1Result = this.readAndProcessArg(text, cursor + 5);
          const arg2Result = this.readAndProcessArg(text, arg1Result.nextCursor);

          // 2. Handle the fraction logic (Mixed & Decimal)
          const processedFrac = this.handleFraction(buffer, arg1Result.content, arg2Result.content);

          // 3. Update buffer and cursor
          // handleFraction might have "consumed" part of the buffer (the Whole number)
          buffer = processedFrac.newBuffer;
          cursor = arg2Result.nextCursor;
          continue;
        }
      }

      // Handle raw braces (recurse to ensure Deep-to-Front)
      // This is important for things like \left( ... \right) or just group { ... }
      // But \frac args are handled explicitly above.
      // If we see a `{` here, it is an isolated group.
      // We strictly don't NEED to recurse into every {}, but for consistency we should,
      // in case there is a \frac hidden inside a group { \frac... }.
      if (char === "{") {
        const block = this.readBalancedBlock(text, cursor);
        const processedInner = this.parseBlock(block.content);
        buffer += `{${processedInner}}`;
        cursor = block.nextCursor;
        continue;
      }

      // Default: copy char
      buffer += char;
      cursor++;
    }

    return buffer;
  }

  /**
   * Reads a balanced { block } and processes its content recursively.
   */
  private readAndProcessArg(
    text: string,
    startFrom: number
  ): { content: string; nextCursor: number } {
    // Skip potential whitespace before the argument
    let scan = startFrom;
    while (scan < text.length && /\s/.test(text[scan])) {
      scan++;
    }

    if (text[scan] !== "{") {
      // Argument is not in braces? (LaTeX standard usually enforces, but loose parsing handled char)
      // For this strict implementation, we assume generated LaTeX uses braces.
      // Fallback: read single char (or command) if needed, but let's stick to braces for robustness.
      return { content: "", nextCursor: scan };
    }

    const { content, nextCursor } = this.readBalancedBlock(text, scan);

    // RECURSION POINT: Process the inner content first (Deep-to-Front)
    const processedContent = this.parseBlock(content);

    return { content: processedContent, nextCursor };
  }

  /**
   * Helper to read a balanced curly brace block.
   */
  private readBalancedBlock(
    text: string,
    openBraceIndex: number
  ): { content: string; nextCursor: number } {
    let depth = 1;
    let i = openBraceIndex + 1;

    while (i < text.length && depth > 0) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") depth--;
      i++;
    }

    // content excludes outer braces
    return {
      content: text.substring(openBraceIndex + 1, i - 1),
      nextCursor: i,
    };
  }

  /**
   * Core Logic: Mixed Number & Decimal Conversion
   * @param currentBuffer The text preceding the \frac (to check for mixed numbers)
   * @param numStr The processed numerator string
   * @param denStr The processed denominator string
   */
  private handleFraction(
    currentBuffer: string,
    numStr: string,
    denStr: string
  ): { newBuffer: string } {
    // 1. Check for Mixed Number Pattern in currentBuffer
    // Look strictly at the end of the buffer for digits.
    // Example buffer: "1 + 2" -> Match "2".
    // Example: "1.2" -> decimal? No, mixed numbers are Integers.

    // We match a whole integer at the very end of the buffer, allowing trailing whitespace.
    // Regex: /(\d+)(\s*)$/
    const mixedMatch = currentBuffer.match(/(\d+)(\s*)$/);

    let whole = 0;
    let isMixed = false;
    let bufferPrefix = currentBuffer; // The buffer part BEFORE the whole number

    if (mixedMatch) {
      // We found a potential mixed number candidate.
      // We must be careful: "1.2" should NOT be parsed as mixed "2 \frac".
      // Check character before the match.
      const matchIndex = mixedMatch.index!;
      const beforeMatch = currentBuffer.substring(0, matchIndex);

      // If precedes with '.', it is a decimal (e.g. 1.2), NOT mixed.
      if (!beforeMatch.trimEnd().endsWith(".")) {
        isMixed = true;
        whole = parseInt(mixedMatch[1], 10);
        bufferPrefix = currentBuffer.substring(0, matchIndex); // Checkpoint before the whole number
      }
    }

    let currentNumStr = numStr;
    let currentDenStr = denStr;

    // --- STEP 1: Mixed -> Improper ---
    if (isMixed) {
      // We have a mixed number. Convert!
      // Constraint: Num and Den must be integers for standard Mixed conversion.
      // If they are decimals (e.g. 2 \frac{1.5}{2}), technically valid in LaTeX but odd.
      // We try to parse them.
      const n = parseFloat(currentNumStr);
      const d = parseFloat(currentDenStr);

      if (!isNaN(n) && !isNaN(d) && d !== 0) {
        this.transformations.add("P.FRAC_MIXED_TO_IMPROPER");
        // Formula: newNum = whole * den + num
        // We use standard float arithmetic, assuming inputs are within safe range.
        const newNum = whole * d + n;
        currentNumStr = newNum.toString();
        // Denom remains same
      } else {
        // Cannot convert (e.g. symbolic denominator), so cancel Mixed detection.
        // Restore buffer (treat the whole number as just a number).
        isMixed = false;
        bufferPrefix = currentBuffer;
      }
    } else {
      bufferPrefix = currentBuffer;
    }

    // --- STEP 2: Fraction -> Decimal (Conditional) ---
    // Rule: "If Decimal Present: Convert all resolved fractions to decimals"
    if (this.hasDecimalContext) {
      const n = parseFloat(currentNumStr);
      const d = parseFloat(currentDenStr);

      // Check if n and d are strictly numeric (no symbols like 'x' or '1+2')
      // We use a strict regex check because parseFloat("1+2") is 1, which is dangerous.
      const isNumeric = (s: string) => /^-?\d+(\.\d+)?$/.test(s.trim());

      if (isNumeric(currentNumStr) && isNumeric(currentDenStr) && d !== 0) {
        this.transformations.add("P.FRAC_TO_DECIMAL");
        const quotient = n / d;
        // Use standard precision strategy
        const decimalVal = parseFloat(quotient.toFixed(6)).toString();
        return { newBuffer: bufferPrefix + decimalVal };
      }
    }

    // --- FALLBACK: Return as Fraction ---
    // If we converted mixed, we return the improper fraction.
    // If not, we return the original fraction.
    return { newBuffer: bufferPrefix + `\\frac{${currentNumStr}}{${currentDenStr}}` };
  }
}
