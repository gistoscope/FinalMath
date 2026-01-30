/**
 * @fileoverview Element classification for KaTeX DOM elements
 */

import { ATOMIC_KINDS, OP_CHARS, STRUCTURAL_CLASSES } from "./constants";

export interface ClassificationResult {
  kind: string;
  role: string;
  idPrefix: string;
  atomic: boolean;
}

/**
 * Class responsible for classifying KaTeX DOM elements.
 */
export class ElementClassifier {
  static isStructuralClass(className: string): boolean {
    return STRUCTURAL_CLASSES.has(className);
  }

  static isStructural(classes: string[]): boolean {
    return classes.some((cls) => STRUCTURAL_CLASSES.has(cls));
  }

  static hasOperatorChar(text: string): boolean {
    const t = text || "";
    for (let i = 0; i < t.length; i++) {
      if (OP_CHARS.includes(t[i])) return true;
    }
    return false;
  }

  static hasDigitChar(text: string): boolean {
    return /[0-9]/.test(text || "");
  }

  static hasGreekChar(text: string): boolean {
    return /[\u0370-\u03FF\u1F00-\u1FFF]/.test(text || "");
  }

  static hasAsciiLetter(text: string): boolean {
    return /[A-Za-z]/.test(text || "");
  }

  static isAtomicKind(kind: string): boolean {
    return ATOMIC_KINDS.has(kind);
  }

  static classify(
    _element: HTMLElement,
    classes: string[],
    text: string,
  ): ClassificationResult {
    const t = (text || "").trim();
    const hasDigit = /[0-9]/.test(t);
    const hasGreekChar = this.hasGreekChar(t);
    const hasAsciiLetter = this.hasAsciiLetter(t);
    const hasOpChar = this.hasOperatorChar(t);

    // --- NUMBERS AND VARIABLES ---

    if (/^[0-9]+$/.test(t)) {
      return { kind: "Num", role: "operand", idPrefix: "num", atomic: true };
    }

    if (/^[0-9]+\.[0-9]+$/.test(t)) {
      return { kind: "Num", role: "operand", idPrefix: "num", atomic: true };
    }

    if (/^[A-Za-z]$/.test(t)) {
      return { kind: "Var", role: "operand", idPrefix: "var", atomic: true };
    }

    if (/^[\u0370-\u03FF\u1F00-\u1FFF]$/.test(t)) {
      return { kind: "Var", role: "operand", idPrefix: "var", atomic: true };
    }

    // --- BINARY OPERATORS ---

    const opChars = "+-−*/:⋅·×÷";
    if (t.length === 1 && opChars.includes(t)) {
      return {
        kind: "BinaryOp",
        role: "operator",
        idPrefix: "op",
        atomic: true,
      };
    }

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

    if (classes.includes("frac-line")) {
      return {
        kind: "FracBar",
        role: "decorator",
        idPrefix: "fracbar",
        atomic: true,
      };
    }

    if (classes.includes("mfrac")) {
      return {
        kind: "Fraction",
        role: "operator",
        idPrefix: "frac",
        atomic: false,
      };
    }

    // --- FALLBACK FOR NUMBERS AND GREEK LETTERS ---

    if (hasGreekChar) {
      return { kind: "Var", role: "operand", idPrefix: "var", atomic: true };
    }

    if (hasDigit && !hasAsciiLetter && !hasGreekChar && !hasOpChar) {
      return { kind: "Num", role: "operand", idPrefix: "num", atomic: true };
    }

    // --- FALLBACK ---

    return { kind: "Other", role: "group", idPrefix: "node", atomic: false };
  }
}
