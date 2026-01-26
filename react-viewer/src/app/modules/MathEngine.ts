/**
 * MathEngine.ts
 * pure logic module for geometric and algebraic calculations.
 */

import { type BBox } from "../surface-map/surface-node";

export class MathEngine {
  /**
   * Clamp a value between min and max.
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Calculate overlap between two vertical intervals.
   */
  static getVerticalOverlap(
    top1: number,
    bottom1: number,
    top2: number,
    bottom2: number,
  ): number {
    return Math.min(bottom1, bottom2) - Math.max(top1, top2);
  }

  /**
   * Check if a point is within a bounding box.
   */
  static containsPoint(x: number, y: number, bbox: BBox): boolean {
    return (
      x >= bbox.left && x <= bbox.right && y >= bbox.top && y <= bbox.bottom
    );
  }

  /**
   * Calculate height of a bbox
   */
  static height(bbox: BBox): number {
    return Math.max(0, bbox.bottom - bbox.top);
  }

  /**
   * Calculate midY of a bbox
   */
  static midY(bbox: BBox): number {
    return (bbox.top + bbox.bottom) / 2;
  }

  /**
   * Interpolate bbox
   */
  static interpolateBBox(
    parentBBox: BBox,
    segmentIndex: number,
    totalSegments: number,
  ): BBox {
    const width = parentBBox.right - parentBBox.left;
    const segmentWidth = width / totalSegments;

    return {
      left: parentBBox.left + segmentIndex * segmentWidth,
      top: parentBBox.top,
      right: parentBBox.left + (segmentIndex + 1) * segmentWidth,
      bottom: parentBBox.bottom,
    };
  }

  /**
   * Check if two bboxes are close horizontally
   */
  static isNextTo(
    leftBox: BBox,
    rightBox: BBox,
    tolerance: number = 0,
  ): boolean {
    const distance = rightBox.left - leftBox.right;
    return distance >= 0 && distance <= tolerance;
  }
}
