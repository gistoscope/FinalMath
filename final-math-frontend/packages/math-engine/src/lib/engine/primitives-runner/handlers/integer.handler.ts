/**
 * Integer Primitive Handler
 *
 * Handles integer arithmetic primitives: P.INT_ADD, P.INT_SUB, P.INT_MUL, P.INT_DIV_*, P.DECIMAL_DIV
 */

import { AstNode } from '../../../ast';
import { PrimitiveId } from '../../../primitive-master';
import { injectable } from 'tsyringe';
import { PrimitiveExecutionContext } from '../primitive-execution.context';
import { IPrimitiveHandler } from '../primitive-handler.interface';
import { PrecisionMathService } from '../services/precision-math.service';

@injectable()
export class IntegerPrimitiveHandler implements IPrimitiveHandler {
  private readonly supportedPrimitives: PrimitiveId[] = [
    'P.INT_ADD',
    'P.INT_SUB',
    'P.INT_MUL',
    'P.INT_DIV_EXACT',
    'P.INT_DIV_TO_INT',
    'P.INT_DIV_TO_FRAC',
    'P.DECIMAL_DIV',
  ];

  constructor(private readonly mathService: PrecisionMathService) {}

  getSupportedPrimitives(): PrimitiveId[] {
    return this.supportedPrimitives;
  }

  canHandle(primitiveId: PrimitiveId): boolean {
    return this.supportedPrimitives.includes(primitiveId);
  }

  handle(ctx: PrimitiveExecutionContext): AstNode | undefined {
    const { root, targetNode, targetPath, primitiveId, astUtils } = ctx;

    // Handle Fraction as Division (for P.INT_DIV_TO_INT, P.INT_DIV_TO_FRAC)
    if (
      targetNode?.type === 'fraction' &&
      (primitiveId === 'P.INT_DIV_TO_INT' ||
        primitiveId === 'P.INT_DIV_TO_FRAC')
    ) {
      return this.handleFractionAsDivision(ctx);
    }

    // Standard binary operation on integers
    if (targetNode?.type !== 'binaryOp') return undefined;
    if (
      targetNode.left.type !== 'integer' ||
      targetNode.right.type !== 'integer'
    ) {
      return undefined;
    }

    const leftValue = targetNode.left.value;
    const rightValue = targetNode.right.value;
    let resultValue: string | null = null;

    switch (primitiveId) {
      case 'P.INT_ADD':
        resultValue = this.mathService.binaryOp('+', leftValue, rightValue);
        break;
      case 'P.INT_SUB':
        resultValue = this.mathService.binaryOp('-', leftValue, rightValue);
        break;
      case 'P.INT_MUL':
        resultValue = this.mathService.binaryOp('*', leftValue, rightValue);
        break;
      case 'P.INT_DIV_EXACT':
      case 'P.INT_DIV_TO_INT':
        resultValue = this.handleExactDivision(leftValue, rightValue);
        break;
      case 'P.INT_DIV_TO_FRAC':
        return this.handleDivisionToFraction(ctx, leftValue, rightValue);
      case 'P.DECIMAL_DIV':
        resultValue = this.mathService.divide(leftValue, rightValue);
        break;
    }

    if (resultValue !== null) {
      return astUtils.replaceNodeAt(root, targetPath, {
        type: 'integer',
        value: resultValue,
      });
    }

    return undefined;
  }

  private handleFractionAsDivision(
    ctx: PrimitiveExecutionContext,
  ): AstNode | undefined {
    const { root, targetNode, targetPath, primitiveId, astUtils } = ctx;

    if (targetNode?.type !== 'fraction') return undefined;

    const a = parseInt(targetNode.numerator, 10);
    const b = parseInt(targetNode.denominator, 10);

    if (b === 0) throw new Error('division-by-zero');

    if (primitiveId === 'P.INT_DIV_TO_INT') {
      if (a % b !== 0) return undefined; // Not exact
      return astUtils.replaceNodeAt(root, targetPath, {
        type: 'integer',
        value: (a / b).toString(),
      });
    }

    if (primitiveId === 'P.INT_DIV_TO_FRAC') {
      return astUtils.replaceNodeAt(root, targetPath, {
        type: 'fraction',
        numerator: a.toString(),
        denominator: b.toString(),
      });
    }

    return undefined;
  }

  private handleExactDivision(
    leftValue: string,
    rightValue: string,
  ): string | null {
    if (leftValue.includes('.') || rightValue.includes('.')) return null;

    try {
      const a = BigInt(leftValue);
      const b = BigInt(rightValue);
      if (b === 0n) throw new Error('division-by-zero');
      if (a % b !== 0n) return null; // Not exact
      return (a / b).toString();
    } catch (e: any) {
      if (e.message === 'division-by-zero') throw e;
      return null;
    }
  }

  private handleDivisionToFraction(
    ctx: PrimitiveExecutionContext,
    leftValue: string,
    rightValue: string,
  ): AstNode | undefined {
    const { root, targetPath, astUtils } = ctx;

    if (leftValue.includes('.') || rightValue.includes('.')) return undefined;

    try {
      const num = BigInt(leftValue);
      const den = BigInt(rightValue);
      if (den === 0n) throw new Error('division-by-zero');

      return astUtils.replaceNodeAt(root, targetPath, {
        type: 'fraction',
        numerator: num.toString(),
        denominator: den.toString(),
      });
    } catch (e: any) {
      if (e.message === 'division-by-zero') throw e;
      return undefined;
    }
  }
}
