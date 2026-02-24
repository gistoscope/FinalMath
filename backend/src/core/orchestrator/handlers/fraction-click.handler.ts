import { injectable } from "tsyringe";
import { AstUtils } from "../../ast/utils.ast.js";
import type { StepHistory } from "../../stepmaster/step-master.types.js";
import type { OrchestratorStepResult } from "../orchestrator.types.js";

export interface FractionClickResult {
  shouldHandle: boolean;
  result?: OrchestratorStepResult;
}

@injectable()
export class FractionClickHandler {
  constructor(private readonly astUtils: AstUtils) {}

  private gcd(a: number, b: number): number {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }

  handle(ast: any, selectionPath: string | null, history: StepHistory): FractionClickResult {
    const clickedNodePath = selectionPath || "root";
    const clickedNode = this.astUtils.getNodeAt(ast, clickedNodePath);

    if (!clickedNode) {
      return { shouldHandle: false };
    }

    // Work on fraction or division operator
    let nodeToProcess = clickedNode;
    if (
      nodeToProcess.type !== "fraction" &&
      !(nodeToProcess.type === "binaryOp" && nodeToProcess.op === "/")
    ) {
      return { shouldHandle: false };
    }

    // Rule 1: Identical Numerator/Denominator a/a -> 1
    if (nodeToProcess.type === "fraction") {
      if (
        nodeToProcess.numerator === nodeToProcess.denominator &&
        parseInt(nodeToProcess.denominator, 10) !== 0
      ) {
        return this.applyReplacement(
          ast,
          clickedNodePath,
          { type: "integer", value: "1" },
          history
        );
      }
    } else if (nodeToProcess.type === "binaryOp" && nodeToProcess.op === "/") {
      const leftLatex = this.astUtils.toLatex(nodeToProcess.left);
      const rightLatex = this.astUtils.toLatex(nodeToProcess.right);
      if (leftLatex === rightLatex) {
        return this.applyReplacement(
          ast,
          clickedNodePath,
          { type: "integer", value: "1" },
          history
        );
      }
    }

    // Rule 2: Fraction Simplification a/b with GCD
    if (nodeToProcess.type === "fraction") {
      const n = parseInt(nodeToProcess.numerator, 10);
      const d = parseInt(nodeToProcess.denominator, 10);
      if (!isNaN(n) && !isNaN(d) && d !== 0) {
        const sharedGcd = this.gcd(n, d);
        if (sharedGcd > 1) {
          const newN = n / sharedGcd;
          const newD = d / sharedGcd;
          let replacement: any;
          if (newD === 1) {
            replacement = { type: "integer", value: newN.toString() };
          } else {
            replacement = {
              type: "fraction",
              numerator: newN.toString(),
              denominator: newD.toString(),
            };
          }
          return this.applyReplacement(ast, clickedNodePath, replacement, history);
        }
      }
    }

    // Rule 3: 1 / (a/b) -> b/a
    if (nodeToProcess.type === "binaryOp" && nodeToProcess.op === "/") {
      const isOne = nodeToProcess.left.type === "integer" && nodeToProcess.left.value === "1";
      const isRightFrac = nodeToProcess.right.type === "fraction";
      const isRightDiv =
        nodeToProcess.right.type === "binaryOp" && (nodeToProcess.right as any).op === "/";

      if (isOne && isRightFrac) {
        const bResult = (nodeToProcess.right as any).denominator;
        const aResult = (nodeToProcess.right as any).numerator;
        let replacement: any;
        if (aResult === "1") {
          replacement = { type: "integer", value: bResult.toString() };
        } else {
          replacement = {
            type: "fraction",
            numerator: bResult.toString(),
            denominator: aResult.toString(),
          };
        }
        return this.applyReplacement(ast, clickedNodePath, replacement, history);
      } else if (isOne && isRightDiv) {
        const aNode = (nodeToProcess.right as any).left;
        const bNode = (nodeToProcess.right as any).right;
        const replacement = { type: "binaryOp", op: "/", left: bNode, right: aNode };
        return this.applyReplacement(ast, clickedNodePath, replacement, history);
      }
    }

    // Rule 4: (a/b) / (x/y) -> (a/b) * (y/x)
    if (nodeToProcess.type === "binaryOp" && nodeToProcess.op === "/") {
      const topFrac =
        nodeToProcess.left.type === "fraction" ||
        (nodeToProcess.left.type === "binaryOp" && (nodeToProcess.left as any).op === "/");
      const bottomFrac =
        nodeToProcess.right.type === "fraction" ||
        (nodeToProcess.right.type === "binaryOp" && (nodeToProcess.right as any).op === "/");

      if (topFrac && bottomFrac) {
        let xNode: any, yNode: any;
        if (nodeToProcess.right.type === "fraction") {
          xNode = { type: "integer", value: (nodeToProcess.right as any).numerator };
          yNode = { type: "integer", value: (nodeToProcess.right as any).denominator };
        } else {
          xNode = (nodeToProcess.right as any).left;
          yNode = (nodeToProcess.right as any).right;
        }

        let rightNode: any;
        if (xNode.type === "integer" && yNode.type === "integer") {
          rightNode = { type: "fraction", numerator: yNode.value, denominator: xNode.value };
        } else {
          rightNode = { type: "binaryOp", op: "/", left: yNode, right: xNode };
        }

        const replacement = {
          type: "binaryOp",
          op: "*",
          left: nodeToProcess.left,
          right: rightNode,
        };
        return this.applyReplacement(ast, clickedNodePath, replacement, history);
      }
    }

    return { shouldHandle: false };
  }

  private applyReplacement(
    ast: any,
    targetPath: string,
    replacement: any,
    history: StepHistory
  ): FractionClickResult {
    const newAst = this.astUtils.replaceNodeAt(ast, targetPath, replacement);
    const newExpressionLatex = this.astUtils.toLatex(newAst);

    return {
      shouldHandle: true,
      result: {
        status: "step-applied",
        engineResult: { ok: true, newExpressionLatex },
        history,
      },
    };
  }
}
