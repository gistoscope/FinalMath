/**
 * @fileoverview Bounding box utility functions
 * Handles conversion and interpolation of bounding boxes.
 */

import { MathEngine } from "../modules/MathEngine.js";

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
   */
  static interpolate(parentBBox, segmentIndex, totalSegments) {
    return MathEngine.interpolateBBox(parentBBox, segmentIndex, totalSegments);
  }

  /**
   * Clamp a value between min and max.
   */
  static clamp(value, min, max) {
    return MathEngine.clamp(value, min, max);
  }

  /**
   * Calculate the midpoint Y coordinate of a bounding box.
   */
  static midY(bbox) {
    return MathEngine.midY(bbox);
  }

  /**
   * Calculate the height of a bounding box.
   */
  static height(bbox) {
    return MathEngine.height(bbox);
  }

  /**
   * Calculate the area of a bounding box.
   */
  static area(bbox) {
    return (bbox.right - bbox.left) * (bbox.bottom - bbox.top);
  }

  /**
   * Check if a point is within a bounding box.
   */
  static containsPoint(x, y, bbox) {
    return MathEngine.containsPoint(x, y, bbox);
  }

  /**
   * Expand a bounding box by a given amount.
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
