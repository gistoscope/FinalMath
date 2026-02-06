/**
 * Fraction Utils Service
 *
 * Provides utility functions for fraction operations.
 */

import { AstNode } from '../../../ast';
import { injectable } from 'tsyringe';

export interface FractionParts {
  n: number;
  d: number;
}

@injectable()
export class FractionUtilsService {
  /**
   * Extracts numerator and denominator from a fraction or mixed number node.
   * Returns null if the node is not a fraction type.
   */
  getFractionParts(node: AstNode | undefined): FractionParts | null {
    if (!node) return null;

    if (node.type === 'fraction') {
      return {
        n: parseInt(node.numerator, 10),
        d: parseInt(node.denominator, 10),
      };
    }

    if (node.type === 'mixed') {
      // Return just the fraction part (ignores whole number)
      return {
        n: parseInt(node.numerator, 10),
        d: parseInt(node.denominator, 10),
      };
    }

    return null;
  }

  /**
   * Calculates the Greatest Common Divisor of two numbers.
   */
  gcd(a: number, b: number): number {
    a = Math.abs(a);
    b = Math.abs(b);
    return b === 0 ? a : this.gcd(b, a % b);
  }

  /**
   * Calculates the Least Common Multiple of two numbers.
   */
  lcm(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return Math.abs((a * b) / this.gcd(a, b));
  }

  /**
   * Simplifies a fraction by dividing numerator and denominator by their GCD.
   */
  simplify(numerator: number, denominator: number): FractionParts {
    if (denominator === 0) throw new Error('division-by-zero');

    const g = this.gcd(numerator, denominator);
    let n = numerator / g;
    let d = denominator / g;

    // Ensure denominator is positive
    if (d < 0) {
      n = -n;
      d = -d;
    }

    return { n, d };
  }

  /**
   * Checks if two fractions have the same denominator.
   */
  haveSameDenominator(left: FractionParts, right: FractionParts): boolean {
    return left.d === right.d;
  }

  /**
   * Finds a common denominator for two fractions.
   * Returns the LCM of their denominators.
   */
  findCommonDenominator(left: FractionParts, right: FractionParts): number {
    return this.lcm(left.d, right.d);
  }

  /**
   * Scales a fraction to a target denominator.
   * Returns null if the target is not a multiple of the current denominator.
   */
  scaleToTarget(
    frac: FractionParts,
    targetDenominator: number,
  ): FractionParts | null {
    if (targetDenominator % frac.d !== 0) return null;

    const scale = targetDenominator / frac.d;
    return {
      n: frac.n * scale,
      d: targetDenominator,
    };
  }

  /**
   * Adds two fractions. Assumes they have the same denominator.
   */
  addSameDen(left: FractionParts, right: FractionParts): FractionParts {
    if (left.d !== right.d) throw new Error('denominators-not-equal');
    return { n: left.n + right.n, d: left.d };
  }

  /**
   * Subtracts two fractions. Assumes they have the same denominator.
   */
  subtractSameDen(left: FractionParts, right: FractionParts): FractionParts {
    if (left.d !== right.d) throw new Error('denominators-not-equal');
    return { n: left.n - right.n, d: left.d };
  }

  /**
   * Multiplies two fractions.
   */
  multiply(left: FractionParts, right: FractionParts): FractionParts {
    return {
      n: left.n * right.n,
      d: left.d * right.d,
    };
  }

  /**
   * Divides two fractions (left / right).
   */
  divide(left: FractionParts, right: FractionParts): FractionParts {
    if (right.n === 0) throw new Error('division-by-zero');
    return {
      n: left.n * right.d,
      d: left.d * right.n,
    };
  }

  /**
   * Returns the reciprocal of a fraction.
   */
  reciprocal(frac: FractionParts): FractionParts {
    if (frac.n === 0) throw new Error('division-by-zero');
    return { n: frac.d, d: frac.n };
  }
}
