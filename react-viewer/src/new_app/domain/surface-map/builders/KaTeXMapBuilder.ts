import { inject, singleton } from "tsyringe";
import { Tokens } from "../../../di/tokens";
import type {
  IGeometryProvider,
  IMapBuilder,
  INodeClassifier,
  SurfaceMapResult,
} from "../interfaces/IMapEngine";
import { SurfaceNode } from "../models/SurfaceNode";
import { ContentSegmenter } from "../providers/ContentSegmenter";
import { SurfaceNodeFactory } from "../providers/SurfaceNodeFactory";

@singleton()
export class KaTeXMapBuilder implements IMapBuilder {
  private atoms: SurfaceNode[] = [];
  private byElement: Map<HTMLElement, SurfaceNode> = new Map();
  private containerBox!: DOMRect;
  private classifier: INodeClassifier;
  private geometry: IGeometryProvider;
  private factory: SurfaceNodeFactory;
  private segmenter: ContentSegmenter;

  constructor(
    @inject(Tokens.INodeClassifier) classifier: INodeClassifier,
    @inject(Tokens.IGeometryProvider) geometry: IGeometryProvider,
    factory: SurfaceNodeFactory,
    segmenter: ContentSegmenter,
  ) {
    this.classifier = classifier;
    this.geometry = geometry;
    this.factory = factory;
    this.segmenter = segmenter;
  }

  public build(container: HTMLElement): SurfaceMapResult {
    this.atoms = [];
    this.byElement = new Map();
    this.containerBox = container.getBoundingClientRect();

    const bases = container.querySelectorAll(".katex-html .base");
    const root = this.factory.createRoot(
      container,
      this.containerBox.width,
      this.containerBox.height,
    );

    if (bases && bases.length) {
      bases.forEach((base) => this._traverse(base as HTMLElement, root));
    }

    return { root, atoms: this.atoms, byElement: this.byElement };
  }

  private _traverse(element: HTMLElement, parent: SurfaceNode) {
    const classes = Array.from(element.classList || []);
    const text = (element.textContent || "").trim();

    if (this.classifier.isStructural(classes)) {
      Array.from(element.children || []).forEach((child) =>
        this._traverse(child as HTMLElement, parent),
      );
      return;
    }

    const mixed = /[0-9]/.test(text) && /[+-−*/:⋅·×÷]/.test(text);

    if (mixed) {
      this._handleMixed(element, parent, text);
      return;
    }

    const info = this.classifier.classify(element, classes, text);
    const bbox = this.geometry.toRelativeBox(element, this.containerBox);

    const hasSize =
      bbox.right - bbox.left > 0.5 && bbox.bottom - bbox.top > 0.5;

    if (info.kind === "Other" && (!text || !hasSize)) {
      Array.from(element.children || []).forEach((child) =>
        this._traverse(child as HTMLElement, parent),
      );
      return;
    }

    const node = new SurfaceNode({
      id: this.factory.nextId(info.idPrefix),
      kind: info.kind,
      role: info.role,
      bbox,
      dom: element,
      latexFragment: text,
      parent,
    });

    parent.addChild(node);
    this.byElement.set(element, node);

    if (info.atomic) {
      if (
        node.kind === "FracBar" ||
        (node.latexFragment || "").trim().length > 0
      ) {
        this.atoms.push(node);
      }
    }

    Array.from(element.children || []).forEach((child) =>
      this._traverse(child as HTMLElement, node),
    );
  }

  private _handleMixed(
    element: HTMLElement,
    parent: SurfaceNode,
    text: string,
  ) {
    if (element.children && element.children.length > 0) {
      Array.from(element.children).forEach((child) =>
        this._traverse(child as HTMLElement, parent),
      );
      return;
    }

    const segments = this.segmenter.segment(text);
    const bbox = this.geometry.toRelativeBox(element, this.containerBox);

    segments.forEach((segment, idx) => {
      const segmentBBox = this.geometry.interpolate(bbox, idx, segments.length);
      const info = this.segmenter.getNodeInfo(segment.type);

      const node = new SurfaceNode({
        id: this.factory.nextId(info.idPrefix),
        kind: info.kind,
        role: info.role,
        bbox: segmentBBox,
        dom: element,
        latexFragment: segment.text,
        parent,
        synthetic: true,
      });

      parent.addChild(node);
      this.byElement.set(element, node);

      if (info.atomic && segment.text.trim().length > 0) {
        this.atoms.push(node);
      }
    });
  }
}
