import { injectable } from 'tsyringe';
import { IBBoxService } from '../interfaces';
import { BBox } from '../types';

@injectable()
export class BBoxService implements IBBoxService {
  toRelativeBox(element: HTMLElement, containerBox: DOMRect): BBox {
    const r = element.getBoundingClientRect();
    return {
      left: r.left - containerBox.left,
      top: r.top - containerBox.top,
      right: r.right - containerBox.left,
      bottom: r.bottom - containerBox.top,
    };
  }

  interpolate(
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

  clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  midY(bbox: BBox): number {
    return (bbox.top + bbox.bottom) / 2;
  }

  height(bbox: BBox): number {
    return Math.max(0, bbox.bottom - bbox.top);
  }

  area(bbox: BBox): number {
    return (bbox.right - bbox.left) * (bbox.bottom - bbox.top);
  }

  containsPoint(x: number, y: number, bbox: BBox): boolean {
    return (
      x >= bbox.left && x <= bbox.right && y >= bbox.top && y <= bbox.bottom
    );
  }

  expand(bbox: BBox, expandX: number, expandY: number): BBox {
    return {
      left: bbox.left - expandX,
      right: bbox.right + expandX,
      top: bbox.top - expandY,
      bottom: bbox.bottom + expandY,
    };
  }
}
