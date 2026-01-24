import type { AstNode } from "./Parser";

export interface AugmentedAstNode extends AstNode {
  id: string;
  left?: AugmentedAstNode;
  right?: AugmentedAstNode;
  arg?: AugmentedAstNode;
  args?: AugmentedAstNode[];
}

/**
 * AST Node that might not have an ID yet during traversal.
 */
interface TraversableNode extends AstNode {
  id?: string;
  left?: TraversableNode;
  right?: TraversableNode;
  arg?: TraversableNode;
  args?: TraversableNode[];
}

export interface OperatorDescriptor {
  nodeId: string;
  operator: string;
  position: number;
}

export interface IntegerDescriptor {
  nodeId: string;
  value: string;
  position: number;
}

/**
 * AST Traverser for augmenting and querying AST nodes.
 * Provides utilities for adding node IDs and enumerating elements.
 */
export class AstTraverser {
  private ast: AstNode | null;

  /**
   * @param {AstNode | null} ast - AST root node
   */
  constructor(ast: AstNode | null) {
    this.ast = ast;
  }

  /**
   * Augment AST with node IDs using the backend's convention.
   * Mutates the AST in place and returns it.
   * @returns {AugmentedAstNode | null} Augmented AST or null
   */
  augmentWithIds(): AugmentedAstNode | null {
    if (!this.ast) return null;

    this._traverseForIds(this.ast as TraversableNode, "root");
    return this.ast as AugmentedAstNode;
  }

  /**
   * Recursive traversal for assigning node IDs.
   * @param {TraversableNode} node - Current AST node
   * @param {string} path - Current path string
   * @private
   */
  private _traverseForIds(node: TraversableNode | undefined, path: string) {
    if (!node) return;

    node.id = path;

    if (node.type === "binaryOp") {
      const leftPath = path === "root" ? "term[0]" : `${path}.term[0]`;
      const rightPath = path === "root" ? "term[1]" : `${path}.term[1]`;
      this._traverseForIds(node.left, leftPath);
      this._traverseForIds(node.right, rightPath);
    } else if (node.type === "fraction") {
      if (node.args) {
        this._traverseForIds(node.args[0], `${path}.num`);
        this._traverseForIds(node.args[1], `${path}.den`);
      }
    } else if (node.type === "unaryOp") {
      this._traverseForIds(node.arg, `${path}.arg`);
    }
  }

  /**
   * Enumerate all operators in the AST in in-order traversal.
   * @returns {OperatorDescriptor[]} Array of operator descriptors
   */
  enumerateOperators(): OperatorDescriptor[] {
    const operators: OperatorDescriptor[] = [];
    let position = 0;

    const traverse = (node: TraversableNode | undefined) => {
      if (!node) return;

      if (node.type === "binaryOp") {
        traverse(node.left);
        operators.push({
          nodeId: node.id || "",
          operator: node.op || "",
          position: position++,
        });
        traverse(node.right);
      } else if (node.type === "fraction") {
        if (node.args) {
          traverse(node.args[0]);
          traverse(node.args[1]);
        }
      } else if (node.type === "unaryOp") {
        traverse(node.arg);
      }
    };

    traverse(this.ast as TraversableNode);
    return operators;
  }

  /**
   * Enumerate all integers in the AST in in-order traversal.
   * @returns {IntegerDescriptor[]} Array of integer descriptors
   */
  enumerateIntegers(): IntegerDescriptor[] {
    const integers: IntegerDescriptor[] = [];
    let position = 0;

    const traverse = (node: TraversableNode | undefined) => {
      if (!node) return;

      if (node.type === "integer") {
        integers.push({
          nodeId: node.id || "",
          value: node.value || "",
          position: position++,
        });
      } else if (node.type === "binaryOp") {
        traverse(node.left);
        traverse(node.right);
      } else if (node.type === "fraction") {
        if (node.args) {
          traverse(node.args[0]);
          traverse(node.args[1]);
        }
      } else if (node.type === "unaryOp") {
        traverse(node.arg);
      }
    };

    traverse(this.ast as TraversableNode);
    return integers;
  }

  /**
   * Static helper to augment an AST with IDs.
   * @param {AstNode | null} root - AST root node
   * @returns {AugmentedAstNode | null} Augmented AST
   */
  static augmentWithIds(root: AstNode | null): AugmentedAstNode | null {
    return new AstTraverser(root).augmentWithIds();
  }

  /**
   * Static helper to enumerate operators.
   * @param {AstNode | null} ast - Augmented AST
   * @returns {OperatorDescriptor[]} Array of operator descriptors
   */
  static enumerateOperators(ast: AstNode | null): OperatorDescriptor[] {
    return new AstTraverser(ast).enumerateOperators();
  }

  /**
   * Static helper to enumerate integers.
   * @param {AstNode | null} ast - Augmented AST
   * @returns {IntegerDescriptor[]} Array of integer descriptors
   */
  static enumerateIntegers(ast: AstNode | null): IntegerDescriptor[] {
    return new AstTraverser(ast).enumerateIntegers();
  }
}
