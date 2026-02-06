/**
 * Fraction Primitive Handler
 *
 * Handles fraction arithmetic primitives: P.FRAC_ADD_*, P.FRAC_SUB_*, P.FRAC_MUL, P.FRAC_DIV, etc.
 */

import { injectable } from 'tsyringe';

import { AstNode } from '../../../ast';
import { PrimitiveId } from '../../../primitive-master';
import { PrimitiveExecutionContext } from '../primitive-execution.context';
import { IPrimitiveHandler } from '../primitive-handler.interface';
import { FractionUtilsService } from '../services/fraction-utils.service';

@injectable()
export class FractionPrimitiveHandler implements IPrimitiveHandler {
  private readonly supportedPrimitives: PrimitiveId[] = [
    'P.FRAC_ADD_SAME_DEN',
    'P.FRAC_SUB_SAME_DEN',
    'P.FRAC_MUL',
    'P.FRAC_DIV',
    'P.FRAC_DIV_AS_MUL',
    'P.FRAC_EQ_SCALE',
    'P.FRAC_ADD_DIFF_DEN_MUL1',
    'P.FRAC_SUB_DIFF_DEN_MUL1',
    'P.FRAC_MUL_BY_ONE',
    'P.FRAC_MUL_UNIT',
    'P.FRAC_EQUIV',
    'P.FRAC_LIFT_LEFT_BY_RIGHT_DEN',
    'P.FRAC_LIFT_RIGHT_BY_LEFT_DEN',
    'P.FRAC_ADD_AFTER_LIFT',
  ];

  constructor(private readonly fractionUtils: FractionUtilsService) {}

  getSupportedPrimitives(): PrimitiveId[] {
    return this.supportedPrimitives;
  }

  canHandle(primitiveId: PrimitiveId): boolean {
    return this.supportedPrimitives.includes(primitiveId);
  }

  handle(ctx: PrimitiveExecutionContext): AstNode | undefined {
    const { root, targetNode, targetPath, primitiveId, astUtils } = ctx;

    // Handle single fraction operations
    if (primitiveId === 'P.FRAC_MUL_BY_ONE') {
      return this.handleMulByOne(ctx);
    }

    if (primitiveId === 'P.FRAC_EQUIV') {
      return this.handleFracEquiv(ctx);
    }

    if (
      primitiveId === 'P.FRAC_LIFT_LEFT_BY_RIGHT_DEN' ||
      primitiveId === 'P.FRAC_LIFT_RIGHT_BY_LEFT_DEN'
    ) {
      const side =
        primitiveId === 'P.FRAC_LIFT_LEFT_BY_RIGHT_DEN' ? 'left' : 'right';
      return this.handleLiftFraction(ctx, side);
    }

    // Handle binary fraction operations
    if (targetNode?.type !== 'binaryOp') {
      console.log(
        `[FRAC-HANDLER] target is not binaryOp: path=${targetPath}, targetType=${targetNode?.type || 'undefined'}`,
      );
      return undefined;
    }

    const leftParts = this.fractionUtils.getFractionParts(targetNode.left);
    const rightParts = this.fractionUtils.getFractionParts(targetNode.right);

    if (!leftParts || !rightParts) {
      console.log(
        `[FRAC-HANDLER] getFractionParts returned null for left or right`,
      );
      return undefined;
    }

    const { n: n1, d: d1 } = leftParts;
    const { n: n2, d: d2 } = rightParts;

    let newFrac: { n: number; d: number } | null = null;
    let newOp: AstNode | undefined;

    switch (primitiveId) {
      case 'P.FRAC_ADD_SAME_DEN':
      case 'P.FRAC_ADD_AFTER_LIFT':
        if (d1 === d2) newFrac = { n: n1 + n2, d: d1 };
        break;

      case 'P.FRAC_SUB_SAME_DEN':
        if (d1 === d2) newFrac = { n: n1 - n2, d: d1 };
        break;

      case 'P.FRAC_ADD_DIFF_DEN_MUL1':
      case 'P.FRAC_SUB_DIFF_DEN_MUL1':
        if (d1 === d2) return undefined; // Denominators must be different
        if (
          targetNode.left.type !== 'fraction' ||
          targetNode.right.type !== 'fraction'
        ) {
          return undefined;
        }
        newOp = {
          type: 'binaryOp',
          op: primitiveId === 'P.FRAC_ADD_DIFF_DEN_MUL1' ? '+' : '-',
          left: {
            type: 'binaryOp',
            op: '*',
            left: targetNode.left,
            right: { type: 'integer', value: '1' },
          },
          right: {
            type: 'binaryOp',
            op: '*',
            left: targetNode.right,
            right: { type: 'integer', value: '1' },
          },
        };
        break;

      case 'P.FRAC_MUL':
        newFrac = { n: n1 * n2, d: d1 * d2 };
        break;

      case 'P.FRAC_DIV':
        if (n2 === 0) throw new Error('division-by-zero');
        newFrac = { n: n1 * d2, d: d1 * n2 };
        break;

      case 'P.FRAC_DIV_AS_MUL':
        newOp = {
          type: 'binaryOp',
          op: '*',
          left: targetNode.left,
          right: {
            type: 'fraction',
            numerator: rightParts.d.toString(),
            denominator: rightParts.n.toString(),
          },
        };
        break;

      case 'P.FRAC_MUL_UNIT':
        if (
          targetNode.left.type === 'fraction' &&
          targetNode.right.type === 'fraction'
        ) {
          if (n2 === d2) {
            newFrac = { n: n1 * n2, d: d1 * d2 };
          }
        }
        break;
    }

    if (newOp) {
      return astUtils.replaceNodeAt(root, targetPath, newOp);
    }

    if (newFrac) {
      return astUtils.replaceNodeAt(root, targetPath, {
        type: 'fraction',
        numerator: newFrac.n.toString(),
        denominator: newFrac.d.toString(),
      });
    }

    return undefined;
  }

  private handleMulByOne(ctx: PrimitiveExecutionContext): AstNode | undefined {
    const { root, targetNode, targetPath, astUtils } = ctx;

    if (targetNode?.type !== 'fraction') return undefined;

    return astUtils.replaceNodeAt(root, targetPath, {
      type: 'binaryOp',
      op: '*',
      left: targetNode,
      right: { type: 'integer', value: '1' },
    });
  }

  private handleFracEquiv(ctx: PrimitiveExecutionContext): AstNode | undefined {
    const { root, targetNode, targetPath, astUtils } = ctx;

    // Normalize path (fix mismatch between 'left'/'right' and 'term[0]'/'term[1]')
    const normalizedPath = targetPath
      .split('.')
      .map((p) => {
        if (p === 'left') return 'term[0]';
        if (p === 'right') return 'term[1]';
        return p;
      })
      .join('.');

    let effectiveTarget = targetNode;
    if (!effectiveTarget || normalizedPath !== targetPath) {
      effectiveTarget = astUtils.getNodeAt(root, normalizedPath);
    }

    if (!effectiveTarget || effectiveTarget.type !== 'fraction')
      return undefined;

    // Determine parent and side
    let parentPath = '';
    let side: 'left' | 'right' | undefined;

    if (normalizedPath === 'term[0]') {
      parentPath = 'root';
      side = 'left';
    } else if (normalizedPath === 'term[1]') {
      parentPath = 'root';
      side = 'right';
    } else if (normalizedPath.endsWith('.term[0]')) {
      parentPath = normalizedPath.substring(0, normalizedPath.length - 8);
      side = 'left';
    } else if (normalizedPath.endsWith('.term[1]')) {
      parentPath = normalizedPath.substring(0, normalizedPath.length - 8);
      side = 'right';
    } else {
      return undefined;
    }

    const parent = astUtils.getNodeAt(root, parentPath);
    if (!parent || parent.type !== 'binaryOp') return undefined;
    if (parent.op !== '+' && parent.op !== '-') return undefined;

    const other = side === 'left' ? parent.right : parent.left;

    let otherDen: number;
    if (other.type === 'fraction') {
      otherDen = parseInt(other.denominator, 10);
    } else if (other.type === 'integer') {
      otherDen = 1;
    } else {
      return undefined;
    }

    const currentNum = parseInt(effectiveTarget.numerator, 10);
    const currentDen = parseInt(effectiveTarget.denominator, 10);

    const commonDen = this.fractionUtils.lcm(currentDen, otherDen);
    if (commonDen === currentDen) return undefined;

    const k = commonDen / currentDen;

    return astUtils.replaceNodeAt(root, normalizedPath, {
      type: 'fraction',
      numerator: (currentNum * k).toString(),
      denominator: (currentDen * k).toString(),
    });
  }

  private handleLiftFraction(
    ctx: PrimitiveExecutionContext,
    side: 'left' | 'right',
  ): AstNode | undefined {
    const { root, targetNode, targetPath, astUtils } = ctx;

    let parentPath = '';
    if (side === 'left' && targetPath.endsWith('.left')) {
      parentPath = targetPath.substring(0, targetPath.length - 5);
    } else if (side === 'right' && targetPath.endsWith('.right')) {
      parentPath = targetPath.substring(0, targetPath.length - 6);
    } else {
      return undefined;
    }

    const parent = astUtils.getNodeAt(root, parentPath);
    if (parent?.type !== 'binaryOp') return undefined;

    const other = side === 'left' ? parent.right : parent.left;
    if (other.type !== 'fraction') return undefined;

    const den = other.denominator;

    return astUtils.replaceNodeAt(root, targetPath, {
      type: 'binaryOp',
      op: '*',
      left: targetNode!,
      right: { type: 'fraction', numerator: den, denominator: den },
    });
  }
}
