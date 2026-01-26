import type { SurfaceNode } from "../models/SurfaceNode";

export interface SurfaceMapResult {
  root: SurfaceNode;
  atoms: SurfaceNode[];
  byElement: Map<HTMLElement, SurfaceNode>;
}

/**
 * Interface for building a surface map from a DOM container.
 */
export interface IMapBuilder {
  build(container: HTMLElement): SurfaceMapResult;
}

/**
 * Interface for classifying DOM elements as math symbols.
 */
export interface INodeClassifier {
  classify(
    element: HTMLElement,
    classes: string[],
    text: string,
  ): { kind: string; role: string; idPrefix: string; atomic: boolean };

  isStructural(classes: string[]): boolean;
}

/**
 * Interface for coordinate and geometry calculations.
 */
export interface IGeometryProvider {
  toRelativeBox(
    element: HTMLElement,
    containerBox: DOMRect,
  ): { left: number; top: number; right: number; bottom: number };
  interpolate(
    bbox: { left: number; top: number; right: number; bottom: number },
    index: number,
    total: number,
  ): { left: number; top: number; right: number; bottom: number };
}

/**
 * High-level orchestration for the Surface Map domain.
 */
export interface IMapEngine {
  initialize(container: HTMLElement): SurfaceMapResult;
  getCurrentMap(): SurfaceMapResult | null;
  hitTest(x: number, y: number, container: HTMLElement): SurfaceNode | null;
}
