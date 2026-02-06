import { injectable } from 'tsyringe';
import { ATOMIC_KINDS, OP_CHARS, STRUCTURAL_CLASSES } from '../constants';
import { IElementClassifier } from '../interfaces';
import { NodeInfo, SurfaceNodeKind } from '../types';

@injectable()
export class ElementClassifierService implements IElementClassifier {
  isStructuralClass(className: string): boolean {
    return STRUCTURAL_CLASSES.has(className);
  }

  isStructural(classes: string[]): boolean {
    return classes.some((cls) => STRUCTURAL_CLASSES.has(cls));
  }

  hasOperatorChar(text: string): boolean {
    const t = text || '';
    for (let i = 0; i < t.length; i++) {
      if (OP_CHARS.includes(t[i])) return true;
    }
    return false;
  }

  hasDigitChar(text: string): boolean {
    return /[0-9]/.test(text || '');
  }

  hasGreekChar(text: string): boolean {
    return /[\u0370-\u03FF\u1F00-\u1FFF]/.test(text || '');
  }

  hasAsciiLetter(text: string): boolean {
    return /[A-Za-z]/.test(text || '');
  }

  isAtomicKind(kind: SurfaceNodeKind): boolean {
    return ATOMIC_KINDS.has(kind);
  }

  classify(element: HTMLElement, classes: string[], text: string): NodeInfo {
    const t = (text || '').trim();
    const hasDigit = /[0-9]/.test(t);
    const hasGreekChar = this.hasGreekChar(t);
    const hasAsciiLetter = this.hasAsciiLetter(t);
    const hasOpChar = this.hasOperatorChar(t);

    // --- NUMBERS AND VARIABLES ---

    // Any sequence of digits is considered a number
    if (/^[0-9]+$/.test(t)) {
      return { kind: 'Num', role: 'operand', idPrefix: 'num', atomic: true };
    }

    // Decimal numbers like 12.5, 0.75, 3.125
    if (/^[0-9]+\.[0-9]+$/.test(t)) {
      return { kind: 'Num', role: 'operand', idPrefix: 'num', atomic: true };
    }

    // Single Latin letter — variable
    if (/^[A-Za-z]$/.test(t)) {
      return { kind: 'Var', role: 'operand', idPrefix: 'var', atomic: true };
    }

    // Single Greek letter — also variable
    if (/^[\u0370-\u03FF\u1F00-\u1FFF]$/.test(t)) {
      return { kind: 'Var', role: 'operand', idPrefix: 'var', atomic: true };
    }

    // --- BINARY OPERATORS ---

    // Single operator character
    const opChars = '+-−*/:⋅·×÷';
    if (t.length === 1 && opChars.includes(t)) {
      return {
        kind: 'BinaryOp',
        role: 'operator',
        idPrefix: 'op',
        atomic: true,
      };
    }

    // Binary operators / relations by KaTeX classes
    if (classes.includes('mbin')) {
      return {
        kind: 'BinaryOp',
        role: 'operator',
        idPrefix: 'op',
        atomic: true,
      };
    }
    if (classes.includes('mrel')) {
      return {
        kind: 'Relation',
        role: 'operator',
        idPrefix: 'rel',
        atomic: true,
      };
    }

    // --- PARENTHESES ---

    // Explicit parentheses by text
    if (t === '(' || t === '[' || t === '{') {
      return {
        kind: 'ParenOpen',
        role: 'decorator',
        idPrefix: 'paren',
        atomic: true,
      };
    }
    if (t === ')' || t === ']' || t === '}') {
      return {
        kind: 'ParenClose',
        role: 'decorator',
        idPrefix: 'paren',
        atomic: true,
      };
    }

    // Parentheses by KaTeX classes
    if (classes.includes('mopen')) {
      return {
        kind: 'ParenOpen',
        role: 'decorator',
        idPrefix: 'paren',
        atomic: true,
      };
    }
    if (classes.includes('mclose')) {
      return {
        kind: 'ParenClose',
        role: 'decorator',
        idPrefix: 'paren',
        atomic: true,
      };
    }

    // --- FRACTIONS ---

    // Fraction bar
    if (classes.includes('frac-line')) {
      return {
        kind: 'FracBar',
        role: 'decorator',
        idPrefix: 'fracbar',
        atomic: true,
      };
    }

    // Fraction container
    if (classes.includes('mfrac')) {
      return {
        kind: 'Fraction',
        role: 'operator',
        idPrefix: 'frac',
        atomic: false,
      };
    }

    // --- FALLBACK FOR NUMBERS AND GREEK LETTERS ---

    // If element has Greek letter and wasn't recognized as more specific
    if (hasGreekChar) {
      return { kind: 'Var', role: 'operand', idPrefix: 'var', atomic: true };
    }

    // If has digit without letters — consider it a number
    if (hasDigit && !hasAsciiLetter && !hasGreekChar && !hasOpChar) {
      return { kind: 'Num', role: 'operand', idPrefix: 'num', atomic: true };
    }

    // --- FALLBACK ---

    // Everything else is a group/container without atomicity
    return { kind: 'Other', role: 'group', idPrefix: 'node', atomic: false };
  }
}
