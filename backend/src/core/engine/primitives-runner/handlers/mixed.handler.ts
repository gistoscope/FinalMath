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
  private readonly supportedPrimitives: PrimitiveId[] = ["P.INT_PLUS_FRAC", "P.INT_MINUS_FRAC"];

  getSupportedPrimitives(): PrimitiveId[] {
    return this.supportedPrimitives;
  }

  canHandle(primitiveId: PrimitiveId): boolean {
    return this.supportedPrimitives.includes(primitiveId);
  }

  handle(ctx: PrimitiveExecutionContext): AstNode | undefined {
    const { root, targetNode, targetPath, primitiveId, astUtils } = ctx;

    if (primitiveId === "P.INT_PLUS_FRAC" || primitiveId === "P.INT_MINUS_FRAC") {
      if (targetNode?.type !== "binaryOp") return undefined;

      const op = primitiveId === "P.INT_PLUS_FRAC" ? "+" : "-";
      if (targetNode.op !== op) return undefined;

      const left = targetNode.left;
      const right = targetNode.right;

      // Identify which one is integer and which is fraction
      // Note: We should check for our generic fraction support (binaryOp division or explicit fraction)
      // But for simplicity, let's rely on structural check.
      // If we use `isFraction` helper, we need it injected.
      // Or we can manually check.

      const isInteger = (n: AstNode) => n.type === "integer";
      const isFraction = (n: AstNode) =>
        n.type === "fraction" || (n.type === "binaryOp" && (n.op === "/" || n.op === "\\div"));

      let newLeft = left;
      let newRight = right;
      let changed = false;

      if (isInteger(left)) {
        newLeft = {
          type: "fraction",
          numerator: (left as any).value,
          denominator: "1",
        };
        changed = true;
      }

      if (isInteger(right)) {
        newRight = {
          type: "fraction",
          numerator: (right as any).value,
          denominator: "1",
        };
        changed = true;
      }

      if (!changed) return undefined; // Nothing to convert

      return astUtils.replaceNodeAt(root, targetPath, {
        type: "binaryOp",
        op: targetNode.op,
        left: newLeft,
        right: newRight,
      });
    }

    return undefined;
  }
}
