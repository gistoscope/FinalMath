/**
 * Precision Math Service
 *
 * Handles high-precision decimal arithmetic using BigInt internally.
 * Avoids floating-point errors by converting decimals to scaled integers.
 */

import { injectable } from "tsyringe";

export interface ScaledInt {
  n: bigint;
  scale: number;
}

@injectable()
export class PrecisionMathService {
  /**
   * Parses a numeric string (integer or decimal) to a scaled BigInt representation.
   * E.g., "12.34" -> { n: 1234n, scale: 2 }
   */
  parseNumericToScaledInt(value: string): ScaledInt {
    let sign = 1n;
    let workVal = value;

    if (workVal.startsWith("-")) {
      sign = -1n;
      workVal = workVal.substring(1);
    } else if (workVal.startsWith("+")) {
      workVal = workVal.substring(1);
    }

    const dotIndex = workVal.indexOf(".");
    if (dotIndex === -1) {
      // Integer
      return { n: sign * BigInt(workVal), scale: 0 };
    }

    // Decimal
    const intPart = workVal.substring(0, dotIndex);
    const fracPart = workVal.substring(dotIndex + 1);
    const scale = fracPart.length;
    const combined = intPart + fracPart;

    return { n: sign * BigInt(combined), scale };
  }

  /**
   * Converts a scaled BigInt back to a decimal string.
   * E.g., { n: 1234n, scale: 2 } -> "12.34"
   */
  scaledIntToDecimalString(n: bigint, scale: number): string {
    if (scale === 0) return n.toString();

    const sign = n < 0n ? "-" : "";
    let absN = n < 0n ? -n : n;
    let s = absN.toString();

    if (s.length <= scale) {
      // Pad left with zeros
      const padding = "0".repeat(scale - s.length);
      s = "0." + padding + s;
    } else {
      // Insert decimal point
      const insertAt = s.length - scale;
      s = s.substring(0, insertAt) + "." + s.substring(insertAt);
    }

    // Trim trailing zeros in fractional part
    if (s.includes(".")) {
      while (s.endsWith("0")) {
        s = s.substring(0, s.length - 1);
      }
      if (s.endsWith(".")) {
        s = s.substring(0, s.length - 1);
      }
    }

    return sign + s;
  }

  /**
   * Performs a binary operation (+, -, *) on two numeric strings.
   * Returns the result as a string.
   */
  binaryOp(op: "+" | "-" | "*", leftValue: string, rightValue: string): string {
    const { n: n1, scale: s1 } = this.parseNumericToScaledInt(leftValue);
    const { n: n2, scale: s2 } = this.parseNumericToScaledInt(rightValue);

    if (op === "*") {
      const res = n1 * n2;
      const newScale = s1 + s2;
      return this.scaledIntToDecimalString(res, newScale);
    }

    // For + and -, align scales
    const commonScale = Math.max(s1, s2);

    const m1 = 10n ** BigInt(commonScale - s1);
    const m2 = 10n ** BigInt(commonScale - s2);

    const val1 = n1 * m1;
    const val2 = n2 * m2;

    let res: bigint;
    if (op === "+") {
      res = val1 + val2;
    } else {
      res = val1 - val2;
    }

    return this.scaledIntToDecimalString(res, commonScale);
  }

  /**
   * Performs decimal division.
   * Returns null if the result is not a finite decimal within precision limit.
   */
  divide(leftValue: string, rightValue: string): string | null {
    const { n: n1, scale: s1 } = this.parseNumericToScaledInt(leftValue);
    const { n: n2, scale: s2 } = this.parseNumericToScaledInt(rightValue);

    if (n2 === 0n) throw new Error("division-by-zero");

    // Division: (n1 * 10^s2) / (n2 * 10^s1)
    let num = n1 * 10n ** BigInt(s2);
    let den = n2 * 10n ** BigInt(s1);

    let extraScale = 0;
    const LIMIT = 10; // Precision limit for finite decimal check

    // Handle negative signs
    let sign = 1n;
    if (num < 0n) {
      num = -num;
      sign = -sign;
    }
    if (den < 0n) {
      den = -den;
      sign = -sign;
    }

    // Multiply numerator by 10 until divisible or limit reached
    while (num % den !== 0n && extraScale < LIMIT) {
      num = num * 10n;
      extraScale++;
    }

    if (num % den === 0n) {
      const res = (num / den) * sign;
      return this.scaledIntToDecimalString(res, extraScale);
    }

    return null; // Not a finite decimal within limit
  }

  /**
   * Calculates the Greatest Common Divisor of two numbers.
   */
  gcd(a: number, b: number): number {
    return b === 0 ? a : this.gcd(b, a % b);
  }

  /**
   * Calculates the Least Common Multiple of two numbers.
   */
  lcm(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return Math.abs((a * b) / this.gcd(a, b));
  }
}
