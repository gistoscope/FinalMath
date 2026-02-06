import { inject, injectable } from 'tsyringe';
import type {
  IBBoxService,
  IContentSegmenter,
  IElementClassifier,
  ISurfaceMapBuilder,
  ISurfaceNodeFactory,
} from '../interfaces';
import { SurfaceMap, SurfaceNode } from '../types';

@injectable()
export class SurfaceMapBuilderService implements ISurfaceMapBuilder {
  // We can't keep state here (atoms, byElement) because service is singleton/transient
  // We must pass a Context object through the recursion

  constructor(
    @inject('IBBoxService') private bboxService: IBBoxService,
    @inject('IElementClassifier') private classifier: IElementClassifier,
    @inject('IContentSegmenter') private segmenter: IContentSegmenter,
    @inject('ISurfaceNodeFactory') private nodeFactory: ISurfaceNodeFactory,
  ) {}

  build(containerElement: HTMLElement): SurfaceMap {
    const containerBox = containerElement.getBoundingClientRect();
    const context = new BuilderContext(containerBox);

    const rootNode = this.nodeFactory.createRoot(
      containerElement,
      containerBox,
    );

    const bases = containerElement.querySelectorAll('.katex-html .base');
    if (bases && bases.length) {
      bases.forEach((base) =>
        this._traverse(base as HTMLElement, rootNode, context),
      );
    }

    return {
      root: rootNode,
      atoms: context.atoms,
      byElement: context.byElement,
    };
  }

  private _traverse(
    element: HTMLElement,
    parentNode: SurfaceNode | null,
    context: BuilderContext,
  ): void {
    const classes = Array.from(element.classList || []);
    const text = (element.textContent || '').trim();

    // Skip structural wrappers, traverse children
    if (this.classifier.isStructural(classes)) {
      Array.from(element.children || []).forEach((child) =>
        this._traverse(child as HTMLElement, parentNode, context),
      );
      return;
    }

    // Check for mixed content (numbers and operators)
    const mixedNumAndOp =
      this.classifier.hasDigitChar(text) &&
      this.classifier.hasOperatorChar(text);

    if (mixedNumAndOp) {
      this._handleMixedContent(element, parentNode, text, context);
      return;
    }

    // Regular classification
    const info = this.classifier.classify(element, classes, text);
    const bbox = this.bboxService.toRelativeBox(element, context.containerBox);
    const width = bbox.right - bbox.left;
    const height = bbox.bottom - bbox.top;
    const hasSize = width > 0.5 && height > 0.5;

    // Skip invisible "Other" nodes
    if (info.kind === 'Other' && (!text || !hasSize)) {
      Array.from(element.children || []).forEach((child) =>
        this._traverse(child as HTMLElement, parentNode, context),
      );
      return;
    }

    // Create the node
    const node = this.nodeFactory.create({
      idPrefix: info.idPrefix,
      kind: info.kind,
      role: info.role,
      bbox,
      dom: element,
      latexFragment: text,
      parent: parentNode,
      synthetic: false,
    });

    if (parentNode && parentNode.addChild) {
      parentNode.addChild(node);
    } else if (parentNode) {
      // Fallback if interface vs class mismatch (should ideally depend on class)
      // but since we injected Factory, we assume it returns method-capable objects
      // If not, we push manually (but `addChild` handles back-link)
      parentNode.children.push(node);
      node.parent = parentNode;
    }

    context.byElement.set(element, node);

    // Add to atoms if interactive
    const hasText = (node.latexFragment || '').trim().length > 0;
    const isAtomic = info.atomic || this.classifier.isAtomicKind(node.kind);

    if (isAtomic) {
      // FracBar has no text but should still be interactive
      if (node.kind === 'FracBar' || hasText) {
        context.atoms.push(node);
      }
    }

    // Recurse to children
    Array.from(element.children || []).forEach((child) =>
      this._traverse(child as HTMLElement, node, context),
    );
  }

  private _handleMixedContent(
    element: HTMLElement,
    parentNode: SurfaceNode | null,
    text: string,
    context: BuilderContext,
  ): void {
    // If element has children, descend into them
    if (element.children && element.children.length > 0) {
      Array.from(element.children).forEach((child) =>
        this._traverse(child as HTMLElement, parentNode, context),
      );
      return;
    }

    // Segment the content
    const segments = this.segmenter.segment(text);
    const bbox = this.bboxService.toRelativeBox(element, context.containerBox);

    segments.forEach((segment, idx) => {
      const segmentBBox = this.bboxService.interpolate(
        bbox,
        idx,
        segments.length,
      );
      const nodeInfo = this.segmenter.getNodeInfo(segment.type);

      const syntheticNode = this.nodeFactory.create({
        idPrefix: nodeInfo.idPrefix,
        kind: nodeInfo.kind,
        role: nodeInfo.role,
        bbox: segmentBBox,
        dom: element, // Map to same element
        latexFragment: segment.text,
        parent: parentNode,
        synthetic: true,
      });

      if (parentNode && parentNode.addChild) {
        parentNode.addChild(syntheticNode);
      }

      // We can't map one element to multiple nodes in byElement directly straightforwardly
      // Last one wins usually, or we skip mapping synthetic nodes 1:1 if strict
      // But preserving mostly compatible behavior:
      context.byElement.set(element, syntheticNode);

      if (nodeInfo.atomic && segment.text.trim().length > 0) {
        context.atoms.push(syntheticNode);
      }
    });
  }
}

/**
 * Helper class to maintain state during a traversal
 */
class BuilderContext {
  atoms: SurfaceNode[] = [];
  byElement = new Map<HTMLElement, SurfaceNode>();

  constructor(public containerBox: DOMRect) {}
}
