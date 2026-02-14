import { injectable } from 'tsyringe';
import { container } from '../di.config';
import {
  IHitTester,
  IOperandFinder,
  ISurfaceMapBuilder,
  ISurfaceMapEnhancer,
  ISurfaceMapSerializer,
} from '../interfaces';
import { SurfaceMap, SurfaceNode } from '../types';

/**
 * Main FacadeService for Surface Map operations.
 * Acts as the entry point for utilizing the Surface Map system.
 */
@injectable()
export class SurfaceMapService {
  /**
   * Build a surface node map from a container element.
   * @param containerElement - Container with KaTeX content
   * @returns SurfaceMap
   */

  private container: HTMLElement | null = null;
  private map: SurfaceMap | null = null;

  buildMap(containerElement: HTMLElement, latex = ''): SurfaceMap {
    this.container = containerElement;

    const builder = container.resolve<ISurfaceMapBuilder>('ISurfaceMapBuilder');
    let map: SurfaceMap;
    map = builder.build(containerElement);
    map = this.enhanceMap(map, containerElement);
    // MISSING: The following calls are needed to populate AST properties
    if (latex) {
      map = this.correlateIntegers(map, latex);
      map = this.correlateOperators(map, latex);
    }
    this.map = map;
    return this.map;
  }

  /**
   * Enhance a surface map with additional classification and logic.
   * @param map - Surface map to enhance
   * @param containerEl - Container element
   * @returns Enhanced SurfaceMap
   */
  enhanceMap(map: SurfaceMap, containerEl: HTMLElement): SurfaceMap {
    const enhancer = container.resolve<ISurfaceMapEnhancer>(
      'ISurfaceMapEnhancer',
    );
    return enhancer.enhance(map, containerEl);
  }

  /**
   * Perform hit test at a point.
   */
  hitTest(clientX: number, clientY: number): SurfaceNode | null {
    if (!this.map || !this.container) {
      throw new Error('Map or container not initialized');
    }
    const tester = container.resolve<IHitTester>('IHitTester');
    return tester.hitTestPoint(this.map, clientX, clientY, this.container);
  }

  /**
   * Find operand nodes for an operator.
   */
  getOperands(
    surfaceMap: SurfaceMap,
    operatorAstPath: string,
  ): { left: SurfaceNode | null; right: SurfaceNode | null } | null {
    const finder = container.resolve<IOperandFinder>('IOperandFinder');
    return finder.find(surfaceMap, operatorAstPath);
  }

  /**
   * Correlate integers with AST.
   */
  correlateIntegers(map: SurfaceMap, latex: string): SurfaceMap {
    const enhancer = container.resolve<ISurfaceMapEnhancer>(
      'ISurfaceMapEnhancer',
    );
    return enhancer.correlateIntegers(map, latex);
  }

  /**
   * Correlate operators with AST.
   */
  correlateOperators(map: SurfaceMap, latex: string): SurfaceMap {
    const enhancer = container.resolve<ISurfaceMapEnhancer>(
      'ISurfaceMapEnhancer',
    );
    return enhancer.correlateOperators(map, latex);
  }

  /**
   * Serialize surface map to plain object.
   */
  serialize(map: SurfaceMap): object {
    const serializer = container.resolve<ISurfaceMapSerializer>(
      'ISurfaceMapSerializer',
    );
    return serializer.serialize(map);
  }
}
