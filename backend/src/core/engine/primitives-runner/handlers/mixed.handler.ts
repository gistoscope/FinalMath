/**
 * Mixed Primitive Handler
 *
 * Handles mixed number operations (integer + fraction, integer - fraction).
 */

import { injectable } from "tsyringe";

import { AstNode } from "@/core/ast";
import { PrimitiveId } from "@/core/primitive-master";
import { PrimitiveExecutionContext } from "../primitive-execution.context";
import { IPrimitiveHandler } from "../primitive-handler.interface";

@injectable()
export class MixedPrimitiveHandler implements IPrimitiveHandler {
  private readonly supportedPrimitives: PrimitiveId[] = [
    "P.INT_PLUS_FRAC_LEFT",
    "P.INT_PLUS_FRAC_RIGHT",
    "P.INT_MINUS_FRAC_LEFT",
    "P.INT_MINUS_FRAC_RIGHT",
  ];

  getSupportedPrimitives(): PrimitiveId[] {
    return this.supportedPrimitives;
  }

  canHandle(primitiveId: PrimitiveId): boolean {
    return this.supportedPrimitives.includes(primitiveId);
  }

  handle(ctx: PrimitiveExecutionContext): AstNode | undefined {
    const { root, targetNode, targetPath, primitiveId, astUtils } = ctx;

    const op = primitiveId.includes("PLUS") ? "+" : "-";
    if (targetNode?.type !== "binaryOp" || targetNode.op !== op) return undefined;

    const left = targetNode.left;
    const right = targetNode.right;

    let newLeft = left;
    let newRight = right;
    let changed = false;

    // Check LEFT Integer
    if (
      (primitiveId === "P.INT_PLUS_FRAC_LEFT" || primitiveId === "P.INT_MINUS_FRAC_LEFT") &&
      left.type === "integer"
    ) {
      newLeft = {
        type: "fraction",
        numerator: (left as any).value,
        denominator: "1",
      };
      changed = true;
    }

    // Check RIGHT Integer
    if (
      (primitiveId === "P.INT_PLUS_FRAC_RIGHT" || primitiveId === "P.INT_MINUS_FRAC_RIGHT") &&
      right.type === "integer"
    ) {
      newRight = {
        type: "fraction",
        numerator: (right as any).value,
        denominator: "1",
      };
      changed = true;
    }

    if (!changed) return undefined;

    return astUtils.replaceNodeAt(root, targetPath, {
      type: "binaryOp",
      op: targetNode.op,
      left: newLeft,
      right: newRight,
    });
  }
}
