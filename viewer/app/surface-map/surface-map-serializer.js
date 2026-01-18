/**
 * @fileoverview Surface map serialization utilities
 * Converts surface maps to JSON-friendly format.
 */

/**
 * Class for serializing surface maps.
 */
export class SurfaceMapSerializer {
  /**
   * Convert a surface node to a plain object.
   * @param {Object} node - Surface node
   * @returns {Object}
   */
  static nodeToPlain(node) {
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
   * @param {Object} map - Surface map
   * @returns {Object}
   */
  static serialize(map) {
    return {
      root: this.nodeToPlain(map.root),
    };
  }
}

/**
 * Serialize a surface map to JSON-friendly format.
 * @param {Object} map - Surface map
 * @returns {Object}
 */
export function surfaceMapToSerializable(map) {
  return SurfaceMapSerializer.serialize(map);
}
