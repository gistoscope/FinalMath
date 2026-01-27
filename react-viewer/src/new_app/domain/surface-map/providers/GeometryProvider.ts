import { singleton } from "tsyringe";
import type { IGeometryProvider } from "../interfaces/IMapEngine";
import type { BBox } from "../models/SurfaceNode";

@singleton()
export class GeometryProvider implements IGeometryProvider {
  public toRelativeBox(element: HTMLElement, containerBox: DOMRect): BBox {
    const box = element.getBoundingClientRect();
    return {
      left: box.left - containerBox.left,
      top: box.top - containerBox.top,
      right: box.right - containerBox.left,
      bottom: box.bottom - containerBox.top,
    };
  }

  public interpolate(bbox: BBox, index: number, total: number): BBox {
    const width = bbox.right - bbox.left;
    const segmentWidth = width / total;

    return {
      left: bbox.left + index * segmentWidth,
      top: bbox.top,
      right: bbox.left + (index + 1) * segmentWidth,
      bottom: bbox.bottom,
    };
  }
}
