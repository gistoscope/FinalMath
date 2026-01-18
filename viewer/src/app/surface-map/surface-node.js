/**
 * @fileoverview Surface node data structures
 * Defines the SurfaceNode class representing nodes in the surface map.
 */

/**
 * Represents a node in the surface map.
 */
export class SurfaceNode {
  /**
   * Create a new surface node.
   * @param {Object} options - Node options
   * @param {string} options.id - Unique identifier
   * @param {string} options.kind - Node kind (Num, Var, BinaryOp, etc.)
   * @param {string} options.role - Node role (operand, operator, decorator, etc.)
   * @param {Object} options.bbox - Bounding box
   * @param {HTMLElement} options.dom - DOM element
   * @param {string} options.latexFragment - LaTeX text fragment
   * @param {SurfaceNode|null} options.parent - Parent node
   * @param {boolean} [options.synthetic=false] - Whether this is a synthetic node
   */
  constructor({
    id,
    kind,
    role,
    bbox,
    dom,
    latexFragment,
    parent = null,
    synthetic = false,
  }) {
    this.id = id;
    this.kind = kind;
    this.role = role;
    this.bbox = bbox;
    this.dom = dom;
    this.latexFragment = latexFragment;
    this.children = [];
    this.parent = parent;
    this.synthetic = synthetic;

    // Optional properties set during correlation
    this.astNodeId = null;
    this.astOperator = null;
    this.astOperatorIndex = null;
    this.astIntegerValue = null;
    this.operatorIndex = null;
    this.meta = null;
  }

  /**
   * Add a child node.
   * @param {SurfaceNode} child - Child node to add
   */
  addChild(child) {
    this.children.push(child);
    child.parent = this;
  }

  /**
   * Check if this node is atomic (interactive).
   * @returns {boolean}
   */
  isAtomic() {
    const atomicKinds = new Set([
      "Num",
      "Var",
      "BinaryOp",
      "Relation",
      "ParenOpen",
      "ParenClose",
      "FracBar",
    ]);
    return atomicKinds.has(this.kind);
  }

  /**
   * Check if this node has meaningful text.
   * @returns {boolean}
   */
  hasText() {
    return (this.latexFragment || "").trim().length > 0;
  }

  /**
   * Convert to a plain object for serialization.
   * @returns {Object}
   */
  toPlain() {
    return {
      id: this.id,
      kind: this.kind,
      role: this.role,
      operatorIndex:
        typeof this.operatorIndex === "number" ? this.operatorIndex : undefined,
      bbox: this.bbox,
      latexFragment: this.latexFragment,
      children: this.children.map((c) => (c.toPlain ? c.toPlain() : c)),
    };
  }
}

/**
 * Factory for creating surface nodes with auto-incrementing IDs.
 */
export class SurfaceNodeFactory {
  constructor() {
    this.idCounter = 0;
  }

  /**
   * Generate the next unique ID with a given prefix.
   * @param {string} prefix - ID prefix (e.g., "num", "op")
   * @returns {string}
   */
  nextId(prefix) {
    return `${prefix}-${(++this.idCounter).toString(36)}`;
  }

  /**
   * Create a new surface node.
   * @param {Object} options - Node options
   * @returns {SurfaceNode}
   */
  create(options) {
    return new SurfaceNode({
      ...options,
      id: options.id || this.nextId(options.idPrefix || "node"),
    });
  }

  /**
   * Create the root node for a surface map.
   * @param {HTMLElement} containerElement - Container DOM element
   * @param {Object} containerBBox - Container bounding box
   * @returns {SurfaceNode}
   */
  createRoot(containerElement, containerBBox) {
    return new SurfaceNode({
      id: "root",
      kind: "Root",
      role: "root",
      bbox: {
        left: 0,
        top: 0,
        right: containerBBox.width,
        bottom: containerBBox.height,
      },
      dom: containerElement,
      latexFragment: "",
      parent: null,
    });
  }
}
