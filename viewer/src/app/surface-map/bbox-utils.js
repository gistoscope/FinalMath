/**
 * @fileoverview Bounding box utility functions
 * Handles conversion and interpolation of bounding boxes.
 */

/**
 * Utility class for bounding box operations.
 */
export class BBoxUtils {
  /**
   * Convert an element's bounding box to coordinates relative to a container.
   * @param {HTMLElement} element - The element to get bounding box for
   * @param {DOMRect} containerBox - The container's bounding client rect
   * @returns {{left: number, top: number, right: number, bottom: number}}
   */
  static toRelativeBox(element, containerBox) {
    const r = element.getBoundingClientRect();
    return {
      left: r.left - containerBox.left,
      top: r.top - containerBox.top,
      right: r.right - containerBox.left,
      bottom: r.bottom - containerBox.top,
    };
  }

  /**
   * Create an interpolated bounding box for a segment within a parent element.
   * Divides the parent's width equally among all segments.
   * @param {Object} parentBBox - Parent bounding box
   * @param {number} segmentIndex - Index of the segment (0-based)
   * @param {number} totalSegments - Total number of segments
   * @returns {{left: number, top: number, right: number, bottom: number}}
   */
  static interpolate(parentBBox, segmentIndex, totalSegments) {
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
   * Clamp a value between min and max.
   * @param {number} value - Value to clamp
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number}
   */
  static clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Calculate the midpoint Y coordinate of a bounding box.
   * @param {Object} bbox - Bounding box
   * @returns {number}
   */
  static midY(bbox) {
    return (bbox.top + bbox.bottom) / 2;
  }

  /**
   * Calculate the height of a bounding box.
   * @param {Object} bbox - Bounding box
   * @returns {number}
   */
  static height(bbox) {
    return Math.max(0, bbox.bottom - bbox.top);
  }

  /**
   * Calculate the area of a bounding box.
   * @param {Object} bbox - Bounding box
   * @returns {number}
   */
  static area(bbox) {
    return (bbox.right - bbox.left) * (bbox.bottom - bbox.top);
  }

  /**
   * Check if a point is within a bounding box.
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {Object} bbox - Bounding box
   * @returns {boolean}
   */
  static containsPoint(x, y, bbox) {
    return (
      x >= bbox.left && x <= bbox.right && y >= bbox.top && y <= bbox.bottom
    );
  }

  /**
   * Expand a bounding box by a given amount.
   * @param {Object} bbox - Original bounding box
   * @param {number} expandX - Horizontal expansion (each side)
   * @param {number} expandY - Vertical expansion (each side)
   * @returns {Object}
   */
  static expand(bbox, expandX, expandY) {
    return {
      left: bbox.left - expandX,
      right: bbox.right + expandX,
      top: bbox.top - expandY,
      bottom: bbox.bottom + expandY,
    };
  }
}
