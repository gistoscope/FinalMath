/**
 * Structural Primitive Handler
 *
 * Handles structural rewriting primitives: P.NEG_*, P.PAREN_*, P.NESTED_FRAC_DIV
 */

import { AstNode } from "@/core/ast";
import { PrimitiveId } from "@/core/primitive-master";
import { injectable } from "tsyringe";
import { PrimitiveExecutionContext } from "../primitive-execution.context";
import { IPrimitiveHandler } from "../primitive-handler.interface";

@injectable()
export class StructuralPrimitiveHandler implements IPrimitiveHandler {
  private readonly supportedPrimitives: PrimitiveId[] = [
    "P.NEG_BEFORE_NUMBER",
    "P.NEG_NEG",
    "P.NEG_DISTRIB_ADD",
    "P.NEG_DISTRIB_SUB",
    "P.NEG_DISTRIBUTE_ADD",
    "P.NEG_DISTRIBUTE_SUB",
    "P.PAREN_AROUND_ATOM_INT",
    "P.PAREN_AROUND_ATOM_FRAC",
    "P.PAREN_AROUND_EXPR_INT",
    "P.PAREN_AROUND_EXPR_FRAC",
    "P.NESTED_FRAC_DIV",
  ];

  getSupportedPrimitives(): PrimitiveId[] {
    return this.supportedPrimitives;
  }

  canHandle(primitiveId: PrimitiveId): boolean {
    return this.supportedPrimitives.includes(primitiveId);
  }

  handle(ctx: PrimitiveExecutionContext): AstNode | undefined {
    const { root, primitiveId } = ctx;

    switch (primitiveId) {
      case "P.NEG_BEFORE_NUMBER":
        return this.handleNegBeforeNumber(ctx);
      case "P.NEG_NEG":
        return this.handleDoubleNeg(ctx);
      case "P.NEG_DISTRIB_ADD":
      case "P.NEG_DISTRIB_SUB":
      case "P.NEG_DISTRIBUTE_ADD":
      case "P.NEG_DISTRIBUTE_SUB":
        return this.handleDistributeNeg(ctx);
      case "P.PAREN_AROUND_ATOM_INT":
      case "P.PAREN_AROUND_ATOM_FRAC":
      case "P.PAREN_AROUND_EXPR_INT":
      case "P.PAREN_AROUND_EXPR_FRAC":
        // Removing parens is a no-op in our AST/Printer
        return root;
      case "P.NESTED_FRAC_DIV":
        return this.handleNestedFracDiv(ctx);
    }

    return undefined;
  }

  private handleNegBeforeNumber(ctx: PrimitiveExecutionContext): AstNode | undefined {
    const { root, targetNode, targetPath, astUtils } = ctx;

    // -(a) -> -a where target is binaryOp(-, 0, a)
    if (
      targetNode?.type === "binaryOp" &&
      targetNode.op === "-" &&
      targetNode.left.type === "integer" &&
      targetNode.left.value === "0"
    ) {
      if (targetNode.right.type === "integer") {
        return astUtils.replaceNodeAt(root, targetPath, {
          type: "integer",
          value: "-" + targetNode.right.value,
        });
      }
    }

    return undefined;
  }

  private handleDoubleNeg(ctx: PrimitiveExecutionContext): AstNode | undefined {
    const { root, targetNode, targetPath, astUtils } = ctx;

    // Case 1: Unary Double Negation -(-x) -> x
    if (targetNode?.type === "unaryOp" && targetNode.op === "-") {
      const inner = targetNode.argument;

      // -(-x) -> x
      if (inner.type === "unaryOp" && inner.op === "-") {
        return astUtils.replaceNodeAt(root, targetPath, inner.argument);
      }

      // -(-5) -> 5 (targetNode is unaryOp, inner is negative integer)
      if (inner.type === "integer" && inner.value.startsWith("-")) {
        return astUtils.replaceNodeAt(root, targetPath, {
          type: "integer",
          value: inner.value.substring(1),
        });
      }
    }

    // Case 2: Binary Subtraction of Negative: a - (-b) -> a + b
    if (targetNode?.type === "binaryOp" && targetNode.op === "-") {
      if (targetNode.right.type === "integer" && targetNode.right.value.startsWith("-")) {
        const val = targetNode.right.value.substring(1); // remove leading -
        return astUtils.replaceNodeAt(root, targetPath, {
          type: "binaryOp",
          op: "+",
          left: targetNode.left,
          right: { type: "integer", value: val },
        });
      }

      // a - (-x) -> a + x (where -x is UnaryOp)
      if (targetNode.right.type === "unaryOp" && targetNode.right.op === "-") {
        return astUtils.replaceNodeAt(root, targetPath, {
          type: "binaryOp",
          op: "+",
          left: targetNode.left,
          right: targetNode.right.argument,
        });
      }
    }

    return undefined;
  }

  private handleDistributeNeg(ctx: PrimitiveExecutionContext): AstNode | undefined {
    const { root, targetNode, targetPath, primitiveId, astUtils } = ctx;

    // Helper to negate a node
    const negate = (node: AstNode): AstNode => {
      // Optimization: if integer, flip sign
      if (node.type === "integer") {
        if (node.value.startsWith("-")) return { type: "integer", value: node.value.substring(1) };
        return { type: "integer", value: "-" + node.value };
      }
      // Optimization: if fraction with negative numerator, flip sign
      if (node.type === "fraction") {
        if (node.numerator.startsWith("-"))
          return {
            type: "fraction",
            numerator: node.numerator.substring(1),
            denominator: node.denominator,
          };
        return { type: "fraction", numerator: "-" + node.numerator, denominator: node.denominator };
      }
      return { type: "unaryOp", op: "-", argument: node };
    };

    // Handle Unary Distribution: -(a + b) -> -a - b  OR  -(a - b) -> -a + b
    if (targetNode?.type === "unaryOp" && targetNode.op === "-") {
      const inner = targetNode.argument;
      if (inner.type === "binaryOp") {
        if (inner.op === "+") {
          // -(a + b) -> -a - b
          return astUtils.replaceNodeAt(root, targetPath, {
            type: "binaryOp",
            op: "-",
            left: negate(inner.left),
            right: inner.right,
          });
        }

        if (inner.op === "-") {
          // -(a - b) -> -a + b
          return astUtils.replaceNodeAt(root, targetPath, {
            type: "binaryOp",
            op: "+",
            left: negate(inner.left),
            right: inner.right,
          });
        }
      }
    }

    if (targetNode?.type !== "binaryOp") return undefined;

    if (primitiveId === "P.NEG_DISTRIB_ADD" || primitiveId === "P.NEG_DISTRIBUTE_ADD") {
      // a - (b + c) -> a - b - c
      if (
        targetNode.op === "-" &&
        targetNode.right.type === "binaryOp" &&
        targetNode.right.op === "+"
      ) {
        const b = targetNode.right.left;
        const c = targetNode.right.right;

        return astUtils.replaceNodeAt(root, targetPath, {
          type: "binaryOp",
          op: "-",
          left: {
            type: "binaryOp",
            op: "-",
            left: targetNode.left,
            right: b,
          },
          right: c,
        });
      }
    }

    if (primitiveId === "P.NEG_DISTRIB_SUB" || primitiveId === "P.NEG_DISTRIBUTE_SUB") {
      // a - (b - c) -> a - b + c
      if (
        targetNode.op === "-" &&
        targetNode.right.type === "binaryOp" &&
        targetNode.right.op === "-"
      ) {
        const b = targetNode.right.left;
        const c = targetNode.right.right;

        return astUtils.replaceNodeAt(root, targetPath, {
          type: "binaryOp",
          op: "+",
          left: {
            type: "binaryOp",
            op: "-",
            left: targetNode.left,
            right: b,
          },
          right: c,
        });
      }
    }

    return undefined;
  }

  private handleNestedFracDiv(ctx: PrimitiveExecutionContext): AstNode | undefined {
    const { root, targetNode, targetPath, astUtils } = ctx;

    // (a/b) / (c/d) -> a/b * d/c
    if (
      targetNode?.type === "binaryOp" &&
      (targetNode.op === "/" || (targetNode.op as string) === ":")
    ) {
      if (targetNode.left.type === "fraction" && targetNode.right.type === "fraction") {
        return astUtils.replaceNodeAt(root, targetPath, {
          type: "binaryOp",
          op: "*",
          left: targetNode.left,
          right: {
            type: "fraction",
            numerator: targetNode.right.denominator,
            denominator: targetNode.right.numerator,
          },
        });
      }
    }

    return undefined;
  }
}
