/**
 * @fileoverview Surface map builder
 */

import { BBoxUtils } from "./bbox-utils";
import { ContentSegmenter } from "./content-segmenter";
import { ElementClassifier } from "./element-classifier";
import { SurfaceNode, SurfaceNodeFactory } from "./surface-node";

/**
 * Class for building surface node maps from KaTeX HTML.
 */
export class SurfaceMapBuilder {
  private containerElement: HTMLElement;
  private containerBox: DOMRect;
  private nodeFactory: SurfaceNodeFactory;
  private atoms: SurfaceNode[];
  private byElement: Map<HTMLElement, SurfaceNode>;

  /**
   * Create a new SurfaceMapBuilder.
   * @param {HTMLElement} containerElement - Container element with KaTeX content
   */
  constructor(containerElement: HTMLElement) {
    this.containerElement = containerElement;
    this.containerBox = containerElement.getBoundingClientRect();
    this.nodeFactory = new SurfaceNodeFactory();
    this.atoms = [];
    this.byElement = new Map();
  }

  /**
   * Build the surface node map.
   */
  build(): {
    root: SurfaceNode;
    atoms: SurfaceNode[];
    byElement: Map<HTMLElement, SurfaceNode>;
  } {
    const bases = this.containerElement.querySelectorAll(".katex-html .base");

    const rootNode = this.nodeFactory.createRoot(
      this.containerElement,
      this.containerBox,
    );

    if (bases && bases.length) {
      bases.forEach((base) => this._traverse(base as HTMLElement, rootNode));
    }

    return {
      root: rootNode,
      atoms: this.atoms,
      byElement: this.byElement,
    };
  }

  /**
   * Traverse the DOM tree and build nodes.
   * @private
   */
  private _traverse(element: HTMLElement, parentNode: SurfaceNode) {
    const classes = Array.from(element.classList || []);
    const text = (element.textContent || "").trim();

    // Skip structural wrappers, traverse children
    if (ElementClassifier.isStructural(classes)) {
      Array.from(element.children || []).forEach((child) =>
        this._traverse(child as HTMLElement, parentNode),
      );
      return;
    }

    // Check for mixed content
    const mixedNumAndOp =
      ElementClassifier.hasDigitChar(text) &&
      ElementClassifier.hasOperatorChar(text);

    if (mixedNumAndOp) {
      this._handleMixedContent(element, parentNode, text);
      return;
    }

    // Regular classification
    const info = ElementClassifier.classify(element, classes, text);
    const bbox = BBoxUtils.toRelativeBox(element, this.containerBox);
    const width = bbox.right - bbox.left;
    const height = bbox.bottom - bbox.top;
    const hasSize = width > 0.5 && height > 0.5;

    // Skip invisible "Other" nodes
    if (info.kind === "Other" && (!text || !hasSize)) {
      Array.from(element.children || []).forEach((child) =>
        this._traverse(child as HTMLElement, parentNode),
      );
      return;
    }

    // Create the node
    const node = new SurfaceNode({
      id: this.nodeFactory.nextId(info.idPrefix),
      kind: info.kind,
      role: info.role,
      bbox,
      dom: element,
      latexFragment: text,
      parent: parentNode,
    });

    if (parentNode) {
      parentNode.addChild(node);
    }

    this.byElement.set(element, node);

    // Add to atoms if interactive
    const hasText = (node.latexFragment || "").trim().length > 0;
    const isAtomic = info.atomic || ElementClassifier.isAtomicKind(node.kind);

    if (isAtomic) {
      if (node.kind === "FracBar" || hasText) {
        this.atoms.push(node);
      }
    }

    // Recurse to children
    Array.from(element.children || []).forEach((child) =>
      this._traverse(child as HTMLElement, node),
    );
  }

  /**
   * @private
   */
  private _handleMixedContent(
    element: HTMLElement,
    parentNode: SurfaceNode,
    text: string,
  ) {
    if (element.children && element.children.length > 0) {
      Array.from(element.children).forEach((child) =>
        this._traverse(child as HTMLElement, parentNode),
      );
      return;
    }

    const segments = ContentSegmenter.segment(text);
    const bbox = BBoxUtils.toRelativeBox(element, this.containerBox);

    segments.forEach((segment, idx) => {
      const segmentBBox = BBoxUtils.interpolate(bbox, idx, segments.length);
      const nodeInfo = ContentSegmenter.getNodeInfo(segment.type);

      const syntheticNode = new SurfaceNode({
        id: this.nodeFactory.nextId(nodeInfo.idPrefix),
        kind: nodeInfo.kind,
        role: nodeInfo.role,
        bbox: segmentBBox,
        dom: element,
        latexFragment: segment.text,
        parent: parentNode,
        synthetic: true,
      });

      if (parentNode) {
        parentNode.addChild(syntheticNode);
      }

      this.byElement.set(element, syntheticNode);

      if (nodeInfo.atomic && segment.text.trim().length > 0) {
        this.atoms.push(syntheticNode);
      }
    });
  }
}

/**
 * Build a surface node map from a container element.
 */
export function buildSurfaceNodeMap(containerElement: HTMLElement) {
  const builder = new SurfaceMapBuilder(containerElement);
  return builder.build();
}
