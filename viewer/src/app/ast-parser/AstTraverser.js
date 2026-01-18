/**
 * AstTraverser.js
 * Handles AST traversal operations: augmentation with IDs, enumeration of operators/integers.
 */

/**
 * AST Traverser for augmenting and querying AST nodes.
 * Provides utilities for adding node IDs and enumerating elements.
 */
export class AstTraverser {
  /**
   * @param {Object} ast - AST root node
   */
  constructor(ast) {
    this.ast = ast;
  }

  /**
   * Augment AST with node IDs using the backend's convention.
   * Mutates the AST in place and returns it.
   * @returns {Object|null} Augmented AST or null
   */
  augmentWithIds() {
    if (!this.ast) return this.ast;

    this._traverseForIds(this.ast, "root");
    return this.ast;
  }

  /**
   * Recursive traversal for assigning node IDs.
   * @param {Object} node - Current AST node
   * @param {string} path - Current path string
   * @private
   */
  _traverseForIds(node, path) {
    if (!node) return;

    node.id = path;

    if (node.type === "binaryOp") {
      const leftPath = path === "root" ? "term[0]" : `${path}.term[0]`;
      const rightPath = path === "root" ? "term[1]" : `${path}.term[1]`;
      this._traverseForIds(node.left, leftPath);
      this._traverseForIds(node.right, rightPath);
    } else if (node.type === "fraction") {
      this._traverseForIds(node.args[0], `${path}.num`);
      this._traverseForIds(node.args[1], `${path}.den`);
    } else if (node.type === "unaryOp") {
      this._traverseForIds(node.arg, `${path}.arg`);
    }
  }

  /**
   * Enumerate all operators in the AST in in-order traversal.
   * @returns {Array<{nodeId: string, operator: string, position: number}>} Array of operator descriptors
   */
  enumerateOperators() {
    const operators = [];
    let position = 0;

    const traverse = (node) => {
      if (!node) return;

      if (node.type === "binaryOp") {
        traverse(node.left);
        operators.push({
          nodeId: node.id,
          operator: node.op,
          position: position++,
        });
        traverse(node.right);
      } else if (node.type === "fraction") {
        traverse(node.args[0]);
        traverse(node.args[1]);
      } else if (node.type === "unaryOp") {
        traverse(node.arg);
      }
    };

    traverse(this.ast);
    return operators;
  }

  /**
   * Enumerate all integers in the AST in in-order traversal.
   * @returns {Array<{nodeId: string, value: string, position: number}>} Array of integer descriptors
   */
  enumerateIntegers() {
    const integers = [];
    let position = 0;

    const traverse = (node) => {
      if (!node) return;

      if (node.type === "integer") {
        integers.push({
          nodeId: node.id,
          value: node.value,
          position: position++,
        });
      } else if (node.type === "binaryOp") {
        traverse(node.left);
        traverse(node.right);
      } else if (node.type === "fraction") {
        traverse(node.args[0]);
        traverse(node.args[1]);
      } else if (node.type === "unaryOp") {
        traverse(node.arg);
      }
    };

    traverse(this.ast);
    return integers;
  }

  /**
   * Static helper to augment an AST with IDs.
   * @param {Object} root - AST root node
   * @returns {Object|null} Augmented AST
   */
  static augmentWithIds(root) {
    return new AstTraverser(root).augmentWithIds();
  }

  /**
   * Static helper to enumerate operators.
   * @param {Object} ast - Augmented AST
   * @returns {Array} Array of operator descriptors
   */
  static enumerateOperators(ast) {
    return new AstTraverser(ast).enumerateOperators();
  }

  /**
   * Static helper to enumerate integers.
   * @param {Object} ast - Augmented AST
   * @returns {Array} Array of integer descriptors
   */
  static enumerateIntegers(ast) {
    return new AstTraverser(ast).enumerateIntegers();
  }
}
