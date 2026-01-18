/**
 * @fileoverview Hit testing for surface maps
 * Provides point-to-node hit testing functionality.
 */

import { BBoxUtils } from "./bbox-utils.js";

/**
 * Class for hit testing surface map nodes.
 */
export class HitTester {
  /**
   * Perform hit test at a point against the atoms in a surface map.
   * @param {Object} map - Surface map with atoms array
   * @param {number} clientX - Client X coordinate (from mouse/pointer event)
   * @param {number} clientY - Client Y coordinate (from mouse/pointer event)
   * @param {HTMLElement} containerElement - Container element
   * @returns {Object|null} The hit node or null
   */
  static hitTestPoint(map, clientX, clientY, containerElement) {
    const cbox = containerElement.getBoundingClientRect();
    const x = clientX - cbox.left;
    const y = clientY - cbox.top;

    const candidates = map.atoms.filter((node) => {
      let b = node.bbox;

      // Expand hit-test area for operators vertically
      // Operators between fractions have small vertical bbox
      if (node.role === "operator") {
        const expandY = 10; // px expansion up and down
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
 * @param {Object} map - Surface map
 * @param {number} clientX - Client X coordinate
 * @param {number} clientY - Client Y coordinate
 * @param {HTMLElement} containerElement - Container element
 * @returns {Object|null}
 */
export function hitTestPoint(map, clientX, clientY, containerElement) {
  return HitTester.hitTestPoint(map, clientX, clientY, containerElement);
}
