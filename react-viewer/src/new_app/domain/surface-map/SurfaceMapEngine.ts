import { inject, singleton } from "tsyringe";
import { Tokens } from "../../di/tokens";
import type {
  IMapBuilder,
  IMapEngine,
  SurfaceMapResult,
} from "./interfaces/IMapEngine";
import { SurfaceNode } from "./models/SurfaceNode";

@singleton()
export class SurfaceMapEngine implements IMapEngine {
  private currentMap: SurfaceMapResult | null = null;
  private builder: IMapBuilder;

  constructor(@inject(Tokens.IMapBuilder) builder: IMapBuilder) {
    this.builder = builder;
  }

  public initialize(container: HTMLElement): SurfaceMapResult {
    const result = this.builder.build(container);
    this.currentMap = result;
    return result;
  }

  public getCurrentMap(): SurfaceMapResult | null {
    return this.currentMap;
  }

  public hitTest(
    clientX: number,
    clientY: number,
    container: HTMLElement,
    target?: HTMLElement,
  ): SurfaceNode | null {
    if (!this.currentMap) return null;

    const cbox = container.getBoundingClientRect();
    const x = clientX - cbox.left;
    const y = clientY - cbox.top;

    const candidates = this.currentMap.atoms.filter((node) => {
      let b = node.bbox;

      // Expand hit-test area for operators vertically
      if (node.role === "operator") {
        b = {
          ...b,
          top: b.top - 10,
          bottom: b.bottom + 10,
        };
      }

      return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
    });

    if (candidates.length > 0) {
      // Select the smallest by area (deepest/most specific)
      candidates.sort((a, b) => {
        const areaA =
          (a.bbox.right - a.bbox.left) * (a.bbox.bottom - a.bbox.top);
        const areaB =
          (b.bbox.right - b.bbox.left) * (b.bbox.bottom - b.bbox.top);
        return areaA - areaB;
      });

      return candidates[0];
    }

    // Fallback: Check by element
    if (target) {
      let curr: HTMLElement | null = target;
      while (curr && curr !== container) {
        if (this.currentMap.byElement.has(curr)) {
          return this.currentMap.byElement.get(curr)!;
        }
        curr = curr.parentElement;
      }
    }

    return null;
  }

  public hitTestRect(rect: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  }): SurfaceNode[] {
    if (!this.currentMap) return [];

    return this.currentMap.atoms.filter((node) => {
      const b = node.bbox;
      return (
        b.left >= rect.left &&
        b.right <= rect.right &&
        b.top >= rect.top &&
        b.bottom <= rect.bottom
      );
    });
  }
}
