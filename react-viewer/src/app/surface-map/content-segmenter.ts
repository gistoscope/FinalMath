/**
 * @fileoverview Content segmentation for mixed text content
 */

import { OP_CHARS } from "./constants";

export interface ContentSegment {
  type: string;
  text: string;
}

export interface SegmentNodeInfo {
  kind: string;
  role: string;
  idPrefix: string;
  atomic: boolean;
}

/**
 * Class responsible for segmenting mixed content into tokens.
 */
export class ContentSegmenter {
  /**
   * Segment mixed content (e.g., "2*5") into individual tokens.
   */
  static segment(text: string): ContentSegment[] {
    const segments: ContentSegment[] = [];
    let i = 0;

    while (i < text.length) {
      const char = text[i];

      if (/\s/.test(char)) {
        i++;
        continue;
      }

      if (/\d/.test(char)) {
        let numText = char;
        i++;
        while (i < text.length && (/\d/.test(text[i]) || text[i] === ".")) {
          numText += text[i];
          i++;
        }
        segments.push({ type: "num", text: numText });
        continue;
      }

      if (OP_CHARS.includes(char)) {
        segments.push({ type: "op", text: char });
        i++;
        continue;
      }

      if (/[A-Za-z]/.test(char)) {
        segments.push({ type: "var", text: char });
        i++;
        continue;
      }

      if (/[\u0370-\u03FF\u1F00-\u1FFF]/.test(char)) {
        segments.push({ type: "var", text: char });
        i++;
        continue;
      }

      i++;
    }

    return segments;
  }

  /**
   * Get the node kind for a segment type.
   */
  static getNodeInfo(segmentType: string): SegmentNodeInfo {
    switch (segmentType) {
      case "num":
        return { kind: "Num", role: "operand", idPrefix: "num", atomic: true };
      case "op":
        return {
          kind: "BinaryOp",
          role: "operator",
          idPrefix: "op",
          atomic: true,
        };
      case "var":
        return { kind: "Var", role: "operand", idPrefix: "var", atomic: true };
      default:
        return {
          kind: "Other",
          role: "group",
          idPrefix: "node",
          atomic: false,
        };
    }
  }
}
