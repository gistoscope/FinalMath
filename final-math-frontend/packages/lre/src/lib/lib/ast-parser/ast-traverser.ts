/**
 * AstTraverser.ts
 * Handles AST traversal operations: augmentation with IDs, enumeration of operators/integers.
 */

import { AstNode } from './types';

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
  /**
   * @param ast - AST root node
   */
  constructor(private readonly ast: AstNode | null) {}

  /**
   * Augment AST with node IDs using the backend's convention.
   * Mutates the AST in place and returns it.
   * @returns Augmented AST or null
   */
  augmentWithIds(): AstNode | null {
    if (!this.ast) return this.ast;

    this._traverseForIds(this.ast, 'root');
    return this.ast;
  }

  /**
   * Recursive traversal for assigning node IDs.
   * @param node - Current AST node
   * @param path - Current path string
   */
  private _traverseForIds(node: AstNode, path: string): void {
    if (!node) return;

    node.id = path;

    if (node.type === 'binaryOp') {
      const leftPath = path === 'root' ? 'term[0]' : `${path}.term[0]`;
      const rightPath = path === 'root' ? 'term[1]' : `${path}.term[1]`;
      this._traverseForIds(node.left, leftPath);
      this._traverseForIds(node.right, rightPath);
    } else if (node.type === 'fraction') {
      this._traverseForIds(node.args[0], `${path}.num`);
      this._traverseForIds(node.args[1], `${path}.den`);
    } else if (node.type === 'unaryOp') {
      this._traverseForIds(node.arg, `${path}.arg`);
    }
  }

  /**
   * Enumerate all operators in the AST in in-order traversal.
   * @returns Array of operator descriptors
   */
  enumerateOperators(): OperatorDescriptor[] {
    const operators: OperatorDescriptor[] = [];
    let position = 0;

    const traverse = (node: AstNode | null | undefined) => {
      if (!node) return;

      if (node.type === 'binaryOp') {
        traverse(node.left);
        if (node.id && node.op) {
          operators.push({
            nodeId: node.id,
            operator: node.op,
            position: position++,
          });
        }
        traverse(node.right);
      } else if (node.type === 'fraction') {
        traverse(node.args[0]);
        traverse(node.args[1]);
      } else if (node.type === 'unaryOp') {
        if (node.id && node.op) {
          operators.push({
            nodeId: node.id,
            operator: node.op,
            position: position++,
          });
        }
        traverse(node.arg);
      }
    };

    traverse(this.ast);
    return operators;
  }

  /**
   * Enumerate all integers in the AST in in-order traversal.
   * @returns Array of integer descriptors
   */
  enumerateIntegers(): IntegerDescriptor[] {
    const integers: IntegerDescriptor[] = [];
    let position = 0;

    const traverse = (node: AstNode | null | undefined) => {
      if (!node) return;

      if (node.type === 'integer') {
        if (node.id && node.value) {
          integers.push({
            nodeId: node.id,
            value: node.value,
            position: position++,
          });
        }
      } else if (node.type === 'binaryOp') {
        traverse(node.left);
        traverse(node.right);
      } else if (node.type === 'fraction') {
        traverse(node.args[0]);
        traverse(node.args[1]);
      } else if (node.type === 'unaryOp') {
        traverse(node.arg);
      }
    };

    traverse(this.ast);
    return integers;
  }

  /**
   * Static helper to augment an AST with IDs.
   * @param root - AST root node
   * @returns Augmented AST
   */
  static augmentWithIds(root: AstNode | null): AstNode | null {
    return new AstTraverser(root).augmentWithIds();
  }

  /**
   * Static helper to enumerate operators.
   * @param ast - Augmented AST
   * @returns Array of operator descriptors
   */
  static enumerateOperators(ast: AstNode | null): OperatorDescriptor[] {
    return new AstTraverser(ast).enumerateOperators();
  }

  /**
   * Static helper to enumerate integers.
   * @param ast - Augmented AST
   * @returns Array of integer descriptors
   */
  static enumerateIntegers(ast: AstNode | null): IntegerDescriptor[] {
    return new AstTraverser(ast).enumerateIntegers();
  }
}
