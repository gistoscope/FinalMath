import { injectable } from 'tsyringe';
import { IOperatorNormalizer } from '../interfaces';

@injectable()
export class OperatorNormalizerService implements IOperatorNormalizer {
  normalize(ch: string): string {
    const s = (ch || '').trim();

    // Multiplication: *, × (U+00D7), · (U+00B7), ⋅ (U+22C5), ∗ (U+2217)
    if (s === '*' || s === '×' || s === '·' || s === '⋅' || s === '∗') {
      return '*';
    }

    // Subtraction: -, − (U+2212)
    if (s === '-' || s === '−') {
      return '-';
    }

    // Division: /, ÷ (U+00F7), : (ASCII colon)
    if (s === '/' || s === '÷' || s === ':') {
      return '/';
    }

    // Addition: + (usually fine, but good to be explicit)
    if (s === '+') {
      return '+';
    }

    return s;
  }
}
