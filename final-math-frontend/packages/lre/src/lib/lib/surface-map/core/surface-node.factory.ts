import { injectable } from 'tsyringe';
import { ISurfaceNodeFactory } from '../interfaces';
import { BBox, SurfaceNode as ISurfaceNode, SurfaceNodeKind } from '../types';
import { SurfaceNode } from './surface-node';

@injectable()
export class SurfaceNodeFactory implements ISurfaceNodeFactory {
  private idCounter = 0;

  nextId(prefix: string): string {
    return `${prefix}-${(++this.idCounter).toString(36)}`;
  }

  create(options: {
    idPrefix?: string;
    id?: string;
    kind: SurfaceNodeKind;
    role: string;
    bbox: BBox;
    dom: HTMLElement | null;
    latexFragment: string;
    parent?: ISurfaceNode | null;
    synthetic?: boolean;
  }): ISurfaceNode {
    return new SurfaceNode({
      id: options.id || this.nextId(options.idPrefix || 'node'),
      kind: options.kind,
      role: options.role,
      bbox: options.bbox,
      dom: options.dom,
      latexFragment: options.latexFragment,
      parent: (options.parent as SurfaceNode) || null,
      synthetic: options.synthetic,
    });
  }

  createRoot(
    containerElement: HTMLElement,
    containerBBox: DOMRect,
  ): ISurfaceNode {
    return new SurfaceNode({
      id: 'root',
      kind: 'Root',
      role: 'root',
      bbox: {
        left: 0,
        top: 0,
        right: containerBBox.width,
        bottom: containerBBox.height,
      },
      dom: containerElement,
      latexFragment: '',
      parent: null,
      synthetic: false,
    });
  }
}
