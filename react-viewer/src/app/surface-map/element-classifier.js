/**
 * @fileoverview Element classification for KaTeX DOM elements
 * Classifies DOM elements into semantic categories (numbers, variables, operators, etc.)
 */

import { ATOMIC_KINDS, OP_CHARS, STRUCTURAL_CLASSES } from "./constants.js";

/**
 * Class responsible for classifying KaTeX DOM elements.
 */
export class ElementClassifier {
  /**
   * Check if a class name is structural (layout-only).
   * @param {string} className - CSS class name
   * @returns {boolean}
   */
  static isStructuralClass(className) {
    return STRUCTURAL_CLASSES.has(className);
  }

  /**
   * Check if any of the classes are structural.
   * @param {string[]} classes - Array of CSS class names
   * @returns {boolean}
   */
  static isStructural(classes) {
    return classes.some((cls) => STRUCTURAL_CLASSES.has(cls));
  }

  /**
   * Check if text contains an operator character.
   * @param {string} text - Text to check
   * @returns {boolean}
   */
  static hasOperatorChar(text) {
    const t = text || "";
    for (let i = 0; i < t.length; i++) {
      if (OP_CHARS.includes(t[i])) return true;
    }
    return false;
  }

  /**
   * Check if text contains a digit character.
   * @param {string} text - Text to check
   * @returns {boolean}
   */
  static hasDigitChar(text) {
    return /[0-9]/.test(text || "");
  }

  /**
   * Check if text contains a Greek character.
   * @param {string} text - Text to check
   * @returns {boolean}
   */
  static hasGreekChar(text) {
    return /[\u0370-\u03FF\u1F00-\u1FFF]/.test(text || "");
  }

  /**
   * Check if text contains an ASCII letter.
   * @param {string} text - Text to check
   * @returns {boolean}
   */
  static hasAsciiLetter(text) {
    return /[A-Za-z]/.test(text || "");
  }

  /**
   * Check if a node kind is atomic.
   * @param {string} kind - Node kind
   * @returns {boolean}
   */
  static isAtomicKind(kind) {
    return ATOMIC_KINDS.has(kind);
  }

  /**
   * Classify a DOM element into a semantic category.
   * @param {HTMLElement} element - DOM element
   * @param {string[]} classes - CSS classes of the element
   * @param {string} text - Text content of the element
   * @returns {{kind: string, role: string, idPrefix: string, atomic: boolean}}
   */
  static classify(element, classes, text) {
    const t = (text || "").trim();
    const hasDigit = /[0-9]/.test(t);
    const hasGreekChar = this.hasGreekChar(t);
    const hasAsciiLetter = this.hasAsciiLetter(t);
    const hasOpChar = this.hasOperatorChar(t);

    // --- NUMBERS AND VARIABLES ---

    // Any sequence of digits is considered a number
    if (/^[0-9]+$/.test(t)) {
      return { kind: "Num", role: "operand", idPrefix: "num", atomic: true };
    }

    // Decimal numbers like 12.5, 0.75, 3.125
    if (/^[0-9]+\.[0-9]+$/.test(t)) {
      return { kind: "Num", role: "operand", idPrefix: "num", atomic: true };
    }

    // Single Latin letter — variable
    if (/^[A-Za-z]$/.test(t)) {
      return { kind: "Var", role: "operand", idPrefix: "var", atomic: true };
    }

    // Single Greek letter — also variable
    if (/^[\u0370-\u03FF\u1F00-\u1FFF]$/.test(t)) {
      return { kind: "Var", role: "operand", idPrefix: "var", atomic: true };
    }

    // --- BINARY OPERATORS ---

    // Single operator character
    const opChars = "+-−*/:⋅·×÷";
    if (t.length === 1 && opChars.includes(t)) {
      console.log("[DEBUG] classifyElement found op:", t);
      return {
        kind: "BinaryOp",
        role: "operator",
        idPrefix: "op",
        atomic: true,
      };
    }

    // Binary operators / relations by KaTeX classes
    if (classes.includes("mbin")) {
      return {
        kind: "BinaryOp",
        role: "operator",
        idPrefix: "op",
        atomic: true,
      };
    }
    if (classes.includes("mrel")) {
      return {
        kind: "Relation",
        role: "operator",
        idPrefix: "rel",
        atomic: true,
      };
    }

    // --- PARENTHESES ---

    // Explicit parentheses by text
    if (t === "(" || t === "[" || t === "{") {
      return {
        kind: "ParenOpen",
        role: "decorator",
        idPrefix: "paren",
        atomic: true,
      };
    }
    if (t === ")" || t === "]" || t === "}") {
      return {
        kind: "ParenClose",
        role: "decorator",
        idPrefix: "paren",
        atomic: true,
      };
    }

    // Parentheses by KaTeX classes
    if (classes.includes("mopen")) {
      return {
        kind: "ParenOpen",
        role: "decorator",
        idPrefix: "paren",
        atomic: true,
      };
    }
    if (classes.includes("mclose")) {
      return {
        kind: "ParenClose",
        role: "decorator",
        idPrefix: "paren",
        atomic: true,
      };
    }

    // --- FRACTIONS ---

    // Fraction bar
    if (classes.includes("frac-line")) {
      return {
        kind: "FracBar",
        role: "decorator",
        idPrefix: "fracbar",
        atomic: true,
      };
    }

    // Fraction container
    if (classes.includes("mfrac")) {
      return {
        kind: "Fraction",
        role: "operator",
        idPrefix: "frac",
        atomic: false,
      };
    }

    // --- FALLBACK FOR NUMBERS AND GREEK LETTERS ---

    // If element has Greek letter and wasn't recognized as more specific
    if (hasGreekChar) {
      return { kind: "Var", role: "operand", idPrefix: "var", atomic: true };
    }

    // If has digit without letters — consider it a number
    if (hasDigit && !hasAsciiLetter && !hasGreekChar && !hasOpChar) {
      return { kind: "Num", role: "operand", idPrefix: "num", atomic: true };
    }

    // --- FALLBACK ---

    // Everything else is a group/container without atomicity
    return { kind: "Other", role: "group", idPrefix: "node", atomic: false };
  }
}
