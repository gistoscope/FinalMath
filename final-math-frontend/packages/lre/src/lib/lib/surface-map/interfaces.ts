import {
  BBox,
  NodeInfo,
  Segment,
  SurfaceMap,
  SurfaceNode,
  SurfaceNodeKind,
} from './types';

export interface IBBoxService {
  toRelativeBox(element: HTMLElement, containerBox: DOMRect): BBox;
  interpolate(
    parentBBox: BBox,
    segmentIndex: number,
    totalSegments: number,
  ): BBox;
  clamp(value: number, min: number, max: number): number;
  midY(bbox: BBox): number;
  height(bbox: BBox): number;
  area(bbox: BBox): number;
  containsPoint(x: number, y: number, bbox: BBox): boolean;
  expand(bbox: BBox, expandX: number, expandY: number): BBox;
}

export interface IOperatorNormalizer {
  normalize(ch: string): string;
}

export interface ISurfaceNodeFactory {
  nextId(prefix: string): string;
  create(options: {
    idPrefix?: string;
    id?: string;
    kind: SurfaceNodeKind;
    role: string;
    bbox: BBox;
    dom: HTMLElement | null;
    latexFragment: string;
    parent?: SurfaceNode | null;
    synthetic?: boolean;
  }): SurfaceNode;
  createRoot(
    containerElement: HTMLElement,
    containerBBox: DOMRect,
  ): SurfaceNode;
}

export interface IElementClassifier {
  isStructural(classes: string[]): boolean;
  hasDigitChar(text: string): boolean;
  hasOperatorChar(text: string): boolean;
  isAtomicKind(kind: SurfaceNodeKind): boolean;
  classify(element: HTMLElement, classes: string[], text: string): NodeInfo;
}

export interface IContentSegmenter {
  segment(text: string): Segment[];
  getNodeInfo(segmentType: string): NodeInfo;
}

export interface ISurfaceMapBuilder {
  build(containerElement: HTMLElement): SurfaceMap;
}

export interface IHitTester {
  hitTestPoint(
    map: SurfaceMap,
    clientX: number,
    clientY: number,
    containerElement: HTMLElement,
  ): SurfaceNode | null;
}

export interface IOperandFinder {
  find(
    surfaceMap: SurfaceMap,
    operatorAstPath: string,
  ): { left: SurfaceNode | null; right: SurfaceNode | null } | null;
}

export interface ISurfaceMapEnhancer {
  enhance(map: SurfaceMap, containerEl: HTMLElement): SurfaceMap;
  correlateIntegers(map: SurfaceMap, latex: string): SurfaceMap;
  correlateOperators(map: SurfaceMap, latex: string): SurfaceMap;
  assertStableIdInjection(map: SurfaceMap): void;
}

export interface ISurfaceMapSerializer {
  serialize(map: SurfaceMap): object;
  nodeToPlain(node: SurfaceNode): object;
}
