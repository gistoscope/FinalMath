import { injectable } from 'tsyringe';
import { OP_CHARS } from '../constants';
import { IContentSegmenter } from '../interfaces';
import { NodeInfo, Segment } from '../types';

@injectable()
export class ContentSegmenterService implements IContentSegmenter {
  segment(text: string): Segment[] {
    const segments: Segment[] = [];
    let i = 0;

    while (i < text.length) {
      const char = text[i];

      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Number segment (including decimals)
      if (/\d/.test(char)) {
        let numText = char;
        i++;
        while (i < text.length && (/\d/.test(text[i]) || text[i] === '.')) {
          numText += text[i];
          i++;
        }
        segments.push({ type: 'num', text: numText });
        continue;
      }

      // Operator segment
      if (OP_CHARS.includes(char)) {
        segments.push({ type: 'op', text: char });
        i++;
        continue;
      }

      // Variable or other single character
      if (/[A-Za-z]/.test(char)) {
        segments.push({ type: 'var', text: char });
        i++;
        continue;
      }

      // Greek or other unicode
      if (/[\u0370-\u03FF\u1F00-\u1FFF]/.test(char)) {
        segments.push({ type: 'var', text: char });
        i++;
        continue;
      }

      // Unknown - skip
      i++;
    }

    return segments;
  }

  getNodeInfo(segmentType: string): NodeInfo {
    switch (segmentType) {
      case 'num':
        return { kind: 'Num', role: 'operand', idPrefix: 'num', atomic: true };
      case 'op':
        return {
          kind: 'BinaryOp',
          role: 'operator',
          idPrefix: 'op',
          atomic: true,
        };
      case 'var':
        return { kind: 'Var', role: 'operand', idPrefix: 'var', atomic: true };
      default:
        return {
          kind: 'Other',
          role: 'group',
          idPrefix: 'node',
          atomic: false,
        };
    }
  }
}
