/**
 * Normalization Primitive Handler
 *
 * Handles type conversion primitives: P.MIXED_TO_SUM, P.INT_TO_FRAC, P.FRAC_TO_INT, etc.
 */

import { AstNode } from "@/core/ast";
import { PrimitiveId } from "@/core/primitive-master";
import { injectable } from "tsyringe";
import { PrimitiveExecutionContext } from "../primitive-execution.context";
import { IPrimitiveHandler } from "../primitive-handler.interface";

@injectable()
export class NormalizationPrimitiveHandler implements IPrimitiveHandler {
  private readonly supportedPrimitives: PrimitiveId[] = [
    "P.DEC_TO_FRAC",
    "P.MIXED_TO_SUM",
    "P.INT_TO_FRAC",
    "P.FRAC_TO_INT",
    "P.ONE_TO_UNIT_FRAC",
    "P.DECIMAL_TO_FRAC",
    "P.ONE_TO_TARGET_DENOM",
  ];

  getSupportedPrimitives(): PrimitiveId[] {
    return this.supportedPrimitives;
  }

  canHandle(primitiveId: PrimitiveId): boolean {
    return this.supportedPrimitives.includes(primitiveId);
  }

  handle(ctx: PrimitiveExecutionContext): AstNode | undefined {
    const { primitiveId } = ctx;

    switch (primitiveId) {
      case "P.MIXED_TO_SUM":
        return this.handleMixedToSum(ctx);
      case "P.INT_TO_FRAC":
        return this.handleIntToFrac(ctx);
      case "P.FRAC_TO_INT":
        return this.handleFracToInt(ctx);
      case "P.ONE_TO_UNIT_FRAC":
        return this.handleOneToUnitFrac(ctx);
      case "P.DECIMAL_TO_FRAC":
        return this.handleDecimalToFrac(ctx);
      case "P.ONE_TO_TARGET_DENOM":
        return this.handleOneToTargetDenom(ctx);
      case "P.DEC_TO_FRAC":
        // Not fully implemented without decimal parsing support
        return undefined;
    }

    return undefined;
  }

  private handleMixedToSum(ctx: PrimitiveExecutionContext): AstNode | undefined {
    const { root, targetNode, targetPath, astUtils } = ctx;

    if (targetNode?.type !== "mixed") return undefined;

    return astUtils.replaceNodeAt(root, targetPath, {
      type: "binaryOp",
      op: "+",
      left: { type: "integer", value: targetNode.whole },
      right: {
        type: "fraction",
        numerator: targetNode.numerator,
        denominator: targetNode.denominator,
      },
    });
  }

  private handleIntToFrac(ctx: PrimitiveExecutionContext): AstNode | undefined {
    const { root, targetNode, targetPath, astUtils } = ctx;

    if (targetNode?.type !== "integer") return undefined;

    return astUtils.replaceNodeAt(root, targetPath, {
      type: "fraction",
      numerator: targetNode.value,
      denominator: "1",
    });
  }

  private handleFracToInt(ctx: PrimitiveExecutionContext): AstNode | undefined {
    const { root, targetNode, targetPath, astUtils } = ctx;

    if (targetNode?.type !== "fraction" || targetNode.denominator !== "1") {
      return undefined;
    }

    return astUtils.replaceNodeAt(root, targetPath, {
      type: "integer",
      value: targetNode.numerator,
    });
  }

  private handleOneToUnitFrac(ctx: PrimitiveExecutionContext): AstNode | undefined {
    const { root, targetNode, targetPath, astUtils } = ctx;

    if (targetNode?.type !== "integer" || targetNode.value !== "1") {
      return undefined;
    }

    // Find a denominator from context
    const den = this.findContextDenominator(root) || "1";

    return astUtils.replaceNodeAt(root, targetPath, {
      type: "fraction",
      numerator: den,
      denominator: den,
    });
  }

  private handleDecimalToFrac(ctx: PrimitiveExecutionContext): AstNode | undefined {
    const { root, targetNode, targetPath, astUtils } = ctx;

    if (!targetNode || targetNode.type !== "integer" || !targetNode.value.includes(".")) {
      return undefined;
    }

    const { n, scale } = this.parseNumericToScaledInt(targetNode.value);
    const denominator = 10n ** BigInt(scale);

    // Simplify using GCD
    const absN = n < 0n ? -n : n;
    const gcdValue = BigInt(this.gcd(Number(absN), Number(denominator)));
    const numerator = n / gcdValue;
    const den = denominator / gcdValue;

    return astUtils.replaceNodeAt(root, targetPath, {
      type: "fraction",
      numerator: numerator.toString(),
      denominator: den.toString(),
    });
  }

  private handleOneToTargetDenom(ctx: PrimitiveExecutionContext): AstNode | undefined {
    const { root, targetNode, targetPath, astUtils } = ctx;

    if (targetNode?.type === "integer") {
      if (targetNode.value !== "1") return undefined;
    } else if (targetNode?.type !== "variable") {
      return undefined;
    }

    const parentPathParts = targetPath.split(".");
    if (parentPathParts.length < 2) return undefined;

    parentPathParts.pop();
    const parentPathStr = parentPathParts.join(".");
    const parent = astUtils.getNodeAt(root, parentPathStr);

    if (!parent || parent.type !== "binaryOp" || parent.op !== "*") {
      return undefined;
    }

    const grandParentPathParts = [...parentPathParts];
    grandParentPathParts.pop();
    const grandParentPathStr = grandParentPathParts.join(".");

    const grandParent = astUtils.getNodeAt(root, grandParentPathStr);
    if (
      !grandParent ||
      grandParent.type !== "binaryOp" ||
      (grandParent.op !== "+" && grandParent.op !== "-")
    ) {
      return undefined;
    }

    const parentIsLeft = parent === grandParent.left;
    const otherBranch = parentIsLeft ? grandParent.right : grandParent.left;

    const extractDenom = (node: AstNode): string | undefined => {
      if (node.type === "binaryOp" && node.op === "*") {
        if (node.left.type === "fraction") return node.left.denominator;
        if (node.right.type === "fraction") return node.right.denominator;
      }
      if (node.type === "fraction") return node.denominator;
      return undefined;
    };

    const d = extractDenom(otherBranch);
    if (!d) return undefined;

    return astUtils.replaceNodeAt(root, targetPath, {
      type: "fraction",
      numerator: d,
      denominator: d,
    });
  }

  private findContextDenominator(node: AstNode): string | null {
    if (node.type === "fraction") {
      if (node.denominator !== "1") return node.denominator;
      return null;
    }
    if (node.type === "binaryOp") {
      const left = this.findContextDenominator(node.left);
      if (left) return left;
      return this.findContextDenominator(node.right);
    }
    return null;
  }

  private parseNumericToScaledInt(value: string): { n: bigint; scale: number } {
    let sign = 1n;
    let workVal = value;
    if (workVal.startsWith("-")) {
      sign = -1n;
      workVal = workVal.substring(1);
    } else if (workVal.startsWith("+")) {
      workVal = workVal.substring(1);
    }

    const dotIndex = workVal.indexOf(".");
    if (dotIndex === -1) {
      return { n: sign * BigInt(workVal), scale: 0 };
    }

    const intPart = workVal.substring(0, dotIndex);
    const fracPart = workVal.substring(dotIndex + 1);
    const scale = fracPart.length;
    const combined = intPart + fracPart;

    return { n: sign * BigInt(combined), scale };
  }

  private gcd(a: number, b: number): number {
    return b === 0 ? a : this.gcd(b, a % b);
  }
}
