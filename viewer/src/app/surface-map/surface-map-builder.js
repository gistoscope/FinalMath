/**
 * @fileoverview Surface map builder
 * Main class for building surface node maps from KaTeX-rendered HTML.
 */

import { BBoxUtils } from "./bbox-utils.js";
import { ContentSegmenter } from "./content-segmenter.js";
import { ElementClassifier } from "./element-classifier.js";
import { SurfaceNodeFactory } from "./surface-node.js";

/**
 * Class for building surface node maps from KaTeX HTML.
 */
export class SurfaceMapBuilder {
  /**
   * Create a new SurfaceMapBuilder.
   * @param {HTMLElement} containerElement - Container element with KaTeX content
   */
  constructor(containerElement) {
    this.containerElement = containerElement;
    this.containerBox = containerElement.getBoundingClientRect();
    this.nodeFactory = new SurfaceNodeFactory();
    this.atoms = [];
    this.byElement = new Map();
  }

  /**
   * Build the surface node map.
   * @returns {{root: Object, atoms: Array, byElement: Map}}
   */
  build() {
    const bases = this.containerElement.querySelectorAll(".katex-html .base");

    const rootNode = this.nodeFactory.createRoot(
      this.containerElement,
      this.containerBox,
    );

    if (bases && bases.length) {
      bases.forEach((base) => this._traverse(base, rootNode));
    }

    return {
      root: rootNode,
      atoms: this.atoms,
      byElement: this.byElement,
    };
  }

  /**
   * Traverse the DOM tree and build nodes.
   * @param {HTMLElement} element - Current element
   * @param {Object} parentNode - Parent surface node
   * @private
   */
  _traverse(element, parentNode) {
    const classes = Array.from(element.classList || []);
    const text = (element.textContent || "").trim();

    // Skip structural wrappers, traverse children
    if (ElementClassifier.isStructural(classes)) {
      Array.from(element.children || []).forEach((child) =>
        this._traverse(child, parentNode),
      );
      return;
    }

    // Check for mixed content (numbers and operators)
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
        this._traverse(child, parentNode),
      );
      return;
    }

    // Create the node
    const node = {
      id: this.nodeFactory.nextId(info.idPrefix),
      kind: info.kind,
      role: info.role,
      bbox,
      dom: element,
      latexFragment: text,
      children: [],
      parent: parentNode,
    };

    if (parentNode) {
      parentNode.children.push(node);
    }

    this.byElement.set(element, node);

    // Add to atoms if interactive
    const hasText = (node.latexFragment || "").trim().length > 0;
    const isAtomic = info.atomic || ElementClassifier.isAtomicKind(node.kind);

    if (isAtomic) {
      // FracBar has no text but should still be interactive
      if (node.kind === "FracBar" || hasText) {
        this.atoms.push(node);
      }
    }

    // Recurse to children
    Array.from(element.children || []).forEach((child) =>
      this._traverse(child, node),
    );
  }

  /**
   * Handle mixed content (e.g., "2*5" in a single element).
   * @param {HTMLElement} element - DOM element
   * @param {Object} parentNode - Parent surface node
   * @param {string} text - Text content
   * @private
   */
  _handleMixedContent(element, parentNode, text) {
    // If element has children, descend into them
    if (element.children && element.children.length > 0) {
      Array.from(element.children).forEach((child) =>
        this._traverse(child, parentNode),
      );
      return;
    }

    // Segment the content
    console.log("[SurfaceMap] Segmenting mixed content:", text);
    const segments = ContentSegmenter.segment(text);
    const bbox = BBoxUtils.toRelativeBox(element, this.containerBox);

    segments.forEach((segment, idx) => {
      const segmentBBox = BBoxUtils.interpolate(bbox, idx, segments.length);
      const nodeInfo = ContentSegmenter.getNodeInfo(segment.type);

      const syntheticNode = {
        id: this.nodeFactory.nextId(nodeInfo.idPrefix),
        kind: nodeInfo.kind,
        role: nodeInfo.role,
        bbox: segmentBBox,
        dom: element,
        latexFragment: segment.text,
        children: [],
        parent: parentNode,
        synthetic: true,
      };

      if (parentNode) {
        parentNode.children.push(syntheticNode);
      }

      this.byElement.set(element, syntheticNode);

      if (nodeInfo.atomic && segment.text.trim().length > 0) {
        this.atoms.push(syntheticNode);
        console.log(
          "[SurfaceMap] Created synthetic atom:",
          syntheticNode.kind,
          syntheticNode.latexFragment,
        );
      }
    });
  }
}

/**
 * Build a surface node map from a container element.
 * @param {HTMLElement} containerElement - Container with KaTeX content
 * @returns {{root: Object, atoms: Array, byElement: Map}}
 */
export function buildSurfaceNodeMap(containerElement) {
  const builder = new SurfaceMapBuilder(containerElement);
  return builder.build();
}
