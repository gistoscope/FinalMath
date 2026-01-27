import { singleton } from "tsyringe";

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

@singleton()
export class GestureProcessor {
  private readonly CLICK_THRESHOLD = 7;

  /**
   * Determine if a movement exceeds the click threshold, indicating a drag.
   */
  public isDragDistance(start: Point, end: Point): boolean {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return dx * dx + dy * dy > this.CLICK_THRESHOLD * this.CLICK_THRESHOLD;
  }

  /**
   * Calculate a bounding box from two points relative to a container.
   */
  public calculateBox(start: Point, end: Point, containerRect: DOMRect): Box {
    return {
      left: Math.min(start.x, end.x) - containerRect.left,
      right: Math.max(start.x, end.x) - containerRect.left,
      top: Math.min(start.y, end.y) - containerRect.top,
      bottom: Math.max(start.y, end.y) - containerRect.top,
    };
  }

  /**
   * Format CSS dimensions for a drag rectangle overlay.
   */
  public getRectDimensions(start: Point, end: Point, containerRect: DOMRect) {
    const left = Math.min(start.x, end.x) - containerRect.left;
    const top = Math.min(start.y, end.y) - containerRect.top;
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      display: "block",
    };
  }
}
