/**
 * MathUtils.ts
 * Pure side-effect free mathematical utility functions.
 */

export class MathUtils {
  /**
   * Clamp a value between min and max.
   */
  public static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Calculate overlap between two vertical intervals.
   */
  public static getVerticalOverlap(
    top1: number,
    bottom1: number,
    top2: number,
    bottom2: number,
  ): number {
    return Math.min(bottom1, bottom2) - Math.max(top1, top2);
  }

  /**
   * Calculate the area of a bounding box.
   */
  public static area(bbox: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  }): number {
    const width = Math.max(0, bbox.right - bbox.left);
    const height = Math.max(0, bbox.bottom - bbox.top);
    return width * height;
  }

  /**
   * Check if a point is within a bounding box.
   */
  public static containsPoint(
    x: number,
    y: number,
    bbox: { left: number; top: number; right: number; bottom: number },
  ): boolean {
    return (
      x >= bbox.left && x <= bbox.right && y >= bbox.top && y <= bbox.bottom
    );
  }

  /**
   * Expand a bounding box by a given amount.
   */
  public static expand(
    bbox: { left: number; top: number; right: number; bottom: number },
    dx: number,
    dy: number,
  ) {
    return {
      left: bbox.left - dx,
      top: bbox.top - dy,
      right: bbox.right + dx,
      bottom: bbox.bottom + dy,
    };
  }
}
