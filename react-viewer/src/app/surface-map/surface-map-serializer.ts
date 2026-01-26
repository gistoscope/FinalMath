import { SurfaceNode, type BBox } from "./surface-node";

export interface PlainSurfaceNode {
  id: string;
  kind: string;
  role: string;
  operatorIndex?: number;
  bbox: BBox;
  latexFragment: string;
  children: PlainSurfaceNode[];
}

/**
 * Class for serializing surface maps.
 */
export class SurfaceMapSerializer {
  /**
   * Convert a surface node to a plain object.
   */
  static nodeToPlain(node: SurfaceNode): PlainSurfaceNode {
    return {
      id: node.id,
      kind: node.kind,
      role: node.role,
      operatorIndex:
        typeof node.operatorIndex === "number" ? node.operatorIndex : undefined,
      bbox: node.bbox,
      latexFragment: node.latexFragment,
      children: node.children.map((child) => this.nodeToPlain(child)),
    };
  }

  /**
   * Serialize a surface map to a JSON-friendly format.
   */
  static serialize(map: { root: SurfaceNode }): { root: PlainSurfaceNode } {
    return {
      root: this.nodeToPlain(map.root),
    };
  }
}

/**
 * Serialize a surface map to JSON-friendly format.
 */
export function surfaceMapToSerializable(map: { root: SurfaceNode }): {
  root: PlainSurfaceNode;
} {
  return SurfaceMapSerializer.serialize(map);
}
