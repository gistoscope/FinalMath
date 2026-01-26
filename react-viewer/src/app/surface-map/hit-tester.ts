/**
 * @fileoverview Hit testing for surface maps
 */

import { BBoxUtils } from "./bbox-utils";
import { SurfaceNode } from "./surface-node";

/**
 * Class for hit testing surface map nodes.
 */
export class HitTester {
  /**
   * Perform hit test at a point against the atoms in a surface map.
   */
  static hitTestPoint(
    map: { atoms: SurfaceNode[] },
    clientX: number,
    clientY: number,
    containerElement: HTMLElement,
  ): SurfaceNode | null {
    const cbox = containerElement.getBoundingClientRect();
    const x = clientX - cbox.left;
    const y = clientY - cbox.top;

    const candidates = map.atoms.filter((node) => {
      let b = node.bbox;

      // Expand hit-test area for operators vertically
      if (node.role === "operator") {
        const expandY = 10;
        b = BBoxUtils.expand(b, 0, expandY);
      }

      return BBoxUtils.containsPoint(x, y, b);
    });

    if (candidates.length === 0) return null;

    // Select the smallest by area (deepest/most specific)
    candidates.sort((a, b) => {
      const areaA = BBoxUtils.area(a.bbox);
      const areaB = BBoxUtils.area(b.bbox);
      return areaA - areaB;
    });

    return candidates[0];
  }
}

/**
 * Simple hit-test by atomic nodes.
 */
export function hitTestPoint(
  map: { atoms: SurfaceNode[] },
  clientX: number,
  clientY: number,
  containerElement: HTMLElement,
): SurfaceNode | null {
  return HitTester.hitTestPoint(map, clientX, clientY, containerElement);
}
