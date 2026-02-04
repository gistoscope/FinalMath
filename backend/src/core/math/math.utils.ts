/**
 * Math Utilities
 *
 * Pure functions for mathematical operations.
 * Follows SRP: Only handles arithmetic calculations.
 */

/**
 * Calculate the Greatest Common Divisor using Euclidean algorithm
 * @param a - First number
 * @param b - Second number
 * @returns GCD of a and b
 */
export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

/**
 * Calculate the Least Common Multiple
 * @param a - First number
 * @param b - Second number
 * @returns LCM of a and b
 */
export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

/**
 * Calculate LCM of multiple numbers
 * @param numbers - Array of numbers
 * @returns LCM of all numbers
 */
export function lcmMultiple(numbers: number[]): number {
  if (numbers.length === 0) return 1;
  return numbers.reduce((acc, num) => lcm(acc, num), numbers[0]);
}

/**
 * Calculate the multiplier needed to reach target denominator
 * @param currentDenom - Current denominator
 * @param targetDenom - Target denominator (LCM)
 * @returns Multiplier (targetDenom / currentDenom)
 */
export function calculateMultiplier(currentDenom: number, targetDenom: number): number {
  if (currentDenom === 0) return 1;
  return targetDenom / currentDenom;
}
