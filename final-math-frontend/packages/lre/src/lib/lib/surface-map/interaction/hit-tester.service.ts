import { inject, injectable } from 'tsyringe';
import type { IBBoxService, IHitTester } from '../interfaces';
import { SurfaceMap, SurfaceNode } from '../types';

@injectable()
export class HitTesterService implements IHitTester {
  constructor(@inject('IBBoxService') private bboxService: IBBoxService) {}

  /**
   * Perform hit test at a point against the atoms in a surface map.
   */
  hitTestPoint(
    map: SurfaceMap,
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
      // Operators between fractions have small vertical bbox
      if (node.role === 'operator') {
        const expandY = 10; // px expansion up and down
        b = this.bboxService.expand(b, 0, expandY);
      }

      return this.bboxService.containsPoint(x, y, b);
    });

    if (candidates.length === 0) return null;

    // Select the smallest by area (deepest/most specific)
    candidates.sort((a, b) => {
      const areaA = this.bboxService.area(a.bbox);
      const areaB = this.bboxService.area(b.bbox);
      return areaA - areaB;
    });

    return candidates[0];
  }
}
