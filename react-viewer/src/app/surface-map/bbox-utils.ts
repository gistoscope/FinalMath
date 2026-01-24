/**
 * @fileoverview Bounding box utility functions
 */

import { MathEngine } from "../modules/MathEngine";
import { BBox } from "./surface-node";

/**
 * Utility class for bounding box operations.
 */
export class BBoxUtils {
  /**
   * Convert an element's bounding box to coordinates relative to a container.
   */
  static toRelativeBox(element: HTMLElement, containerBox: DOMRect): BBox {
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
   */
  static interpolate(
    parentBBox: BBox,
    segmentIndex: number,
    totalSegments: number,
  ): BBox {
    return MathEngine.interpolateBBox(parentBBox, segmentIndex, totalSegments);
  }

  /**
   * Clamp a value between min and max.
   */
  static clamp(value: number, min: number, max: number): number {
    return MathEngine.clamp(value, min, max);
  }

  /**
   * Calculate the midpoint Y coordinate of a bounding box.
   */
  static midY(bbox: BBox): number {
    return MathEngine.midY(bbox);
  }

  /**
   * Calculate the height of a bounding box.
   */
  static height(bbox: BBox): number {
    return MathEngine.height(bbox);
  }

  /**
   * Calculate the area of a bounding box.
   */
  static area(bbox: BBox): number {
    return (bbox.right - bbox.left) * (bbox.bottom - bbox.top);
  }

  /**
   * Check if a point is within a bounding box.
   */
  static containsPoint(x: number, y: number, bbox: BBox): boolean {
    return MathEngine.containsPoint(x, y, bbox);
  }

  /**
   * Expand a bounding box by a given amount.
   */
  static expand(bbox: BBox, expandX: number, expandY: number): BBox {
    return {
      left: bbox.left - expandX,
      right: bbox.right + expandX,
      top: bbox.top - expandY,
      bottom: bbox.bottom + expandY,
    };
  }
}
