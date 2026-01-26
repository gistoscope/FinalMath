/* eslint-disable @typescript-eslint/no-explicit-any */
import { singleton } from "tsyringe";
import type { AstNode, AugmentedAstNode } from "../models/AstNode";

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
 */
@singleton()
export class AstTraverser {
  /**
   * Augment AST with node IDs using the backend's convention.
   * Mutates the AST in place and returns it.
   */
  public augmentWithIds(root: AstNode | null): AugmentedAstNode | null {
    if (!root) return null;
    this._traverseForIds(root as any, "root");
    return root as AugmentedAstNode;
  }

  private _traverseForIds(node: any | undefined, path: string) {
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
   */
  public enumerateOperators(ast: AstNode | null): OperatorDescriptor[] {
    const operators: OperatorDescriptor[] = [];
    let position = 0;

    const traverse = (node: any | undefined) => {
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

    traverse(ast as any);
    return operators;
  }

  /**
   * Enumerate all integers in the AST in in-order traversal.
   */
  public enumerateIntegers(ast: AstNode | null): IntegerDescriptor[] {
    const integers: IntegerDescriptor[] = [];
    let position = 0;

    const traverse = (node: any | undefined) => {
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

    traverse(ast as any);
    return integers;
  }
}
