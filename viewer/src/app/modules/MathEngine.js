/**
 * MathEngine.js
 * pure logic module for geometric and algebraic calculations.
 */

export class MathEngine {
  /**
   * Clamp a value between min and max.
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  static clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Calculate overlap between two vertical intervals.
   * @param {number} top1
   * @param {number} bottom1
   * @param {number} top2
   * @param {number} bottom2
   * @returns {number}
   */
  static getVerticalOverlap(top1, bottom1, top2, bottom2) {
    return Math.min(bottom1, bottom2) - Math.max(top1, top2);
  }

  /**
   * Check if a point is within a bounding box.
   * @param {number} x
   * @param {number} y
   * @param {{left:number, right:number, top:number, bottom:number}} bbox
   * @returns {boolean}
   */
  static containsPoint(x, y, bbox) {
    return (
      x >= bbox.left && x <= bbox.right && y >= bbox.top && y <= bbox.bottom
    );
  }

  /**
   * Calculate height of a bbox
   */
  static height(bbox) {
    return Math.max(0, bbox.bottom - bbox.top);
  }

  /**
   * Calculate midY of a bbox
   */
  static midY(bbox) {
    return (bbox.top + bbox.bottom) / 2;
  }

  /**
   * Interpolate bbox
   */
  static interpolateBBox(parentBBox, segmentIndex, totalSegments) {
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
  static isNextTo(leftBox, rightBox, tolerance = 0) {
    const distance = rightBox.left - leftBox.right;
    return distance >= 0 && distance <= tolerance;
  }
}
