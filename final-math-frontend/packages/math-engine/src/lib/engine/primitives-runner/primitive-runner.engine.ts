/**
 * Primitive Runner (TzV1.1) - Refactored
 *
 * Executes atomic primitives on the AST.
 * This serves as the internal "Engine Stub" for V1.1.
 *
 * Refactored to use SOLID principles:
 * - Delegates to PrimitiveHandlerRegistry (Strategy Pattern)
 * - Uses AstPatternService for pattern-based execution
 * - Uses PrimitiveExecutionContextFactory for context creation
 */

import { AstParser, AstUtils } from '../../ast';
import { PrimitiveId } from '../../primitive-master';
import { injectable } from 'tsyringe';

import {
  EngineStepExecutionRequest,
  EngineStepExecutionResult,
} from '../types.engine';
import { PrimitiveExecutionContextFactory } from './primitive-execution.context';
import { PrimitiveHandlerRegistry } from './primitive-handler.registry';
import { AstPatternService } from './services/ast-pattern.service';

/**
 * Primitives that require legacy (code-based) execution
 * because they involve arithmetic computation that pattern substitution cannot handle.
 */
const FORCE_LEGACY_PRIMITIVES: PrimitiveId[] = [
  'P.INT_ADD',
  'P.INT_SUB',
  'P.INT_MUL',
  'P.INT_DIV_TO_INT',
  'P.DEC_TO_FRAC',
  'P.FRAC_EQUIV',
];

@injectable()
export class PrimitiveRunner {
  constructor(
    private readonly astParser: AstParser,
    private readonly astUtils: AstUtils,
    private readonly contextFactory: PrimitiveExecutionContextFactory,
    private readonly handlerRegistry: PrimitiveHandlerRegistry,
    private readonly patternService: AstPatternService,
  ) {}

  /**
   * Executes a primitive step on the given expression.
   *
   * @param req The execution request containing expression, target, and primitive info
   * @returns The execution result with the new expression or error
   */
  run(req: EngineStepExecutionRequest): EngineStepExecutionResult {
    const {
      expressionLatex,
      primitiveId,
      targetPath,
      bindings,
      resultPattern,
    } = req;

    // 1. Parse the expression
    const ast = this.astParser.parseExpression(expressionLatex);
    if (!ast) {
      return { ok: false, errorCode: 'parse-error' };
    }

    try {
      let newAst;

      // 2. Determine execution mode
      const shouldUseLegacy = FORCE_LEGACY_PRIMITIVES.includes(primitiveId);
      const canUsePattern = resultPattern && bindings && !shouldUseLegacy;

      if (canUsePattern) {
        // Pattern-based execution
        newAst = this.patternService.generateResultFromPattern(
          ast,
          targetPath,
          resultPattern,
          bindings,
        );
      } else {
        // Handler-based execution (Strategy Pattern)
        const ctx = this.contextFactory.createFromAst(
          ast,
          targetPath,
          primitiveId,
          {
            bindings,
            resultPattern,
          },
        );

        newAst = this.handlerRegistry.execute(ctx);
      }

      // 3. Handle execution failure
      if (!newAst) {
        console.log(
          `[V5-RUNNER-END] primitiveId=${primitiveId} ok=false errorCode=primitive-failed resultLatex=null`,
        );
        return { ok: false, errorCode: 'primitive-failed' };
      }

      // 4. Convert result to LaTeX
      const resLatex = this.astUtils.toLatex(newAst);
      console.log(
        `[V5-RUNNER-END] primitiveId=${primitiveId} ok=true errorCode=null resultLatex=${resLatex}`,
      );

      return {
        ok: true,
        newExpressionLatex: resLatex,
      };
    } catch (e) {
      const errCode = e instanceof Error ? e.message : 'unknown-error';
      console.log(
        `[V5-RUNNER-END] primitiveId=${primitiveId} ok=false errorCode=${errCode} resultLatex=null`,
      );
      return { ok: false, errorCode: errCode };
    }
  }
}
