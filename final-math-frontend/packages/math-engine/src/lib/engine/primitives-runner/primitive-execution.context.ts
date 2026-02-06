/**
 * Primitive Execution Context
 *
 * Contains all data required to execute a primitive operation.
 */

import { AstNode, AstParser, AstUtils } from '../../ast';
import { PrimitiveId } from '../../primitive-master';
import { injectable } from 'tsyringe';
import { EngineStepExecutionRequest } from '../types.engine';

/**
 * Context object passed to primitive handlers during execution.
 */
export interface PrimitiveExecutionContext {
  /**
   * The root AST node of the expression.
   */
  root: AstNode;

  /**
   * The target node to operate on (resolved from targetPath).
   */
  targetNode: AstNode | undefined;

  /**
   * The path to the target node (e.g., "root.term[0].left").
   */
  targetPath: string;

  /**
   * The primitive operation to execute.
   */
  primitiveId: PrimitiveId;

  /**
   * AST utility functions for node manipulation.
   */
  astUtils: AstUtils;

  /**
   * Optional variable bindings from pattern matching.
   */
  bindings?: Record<string, any>;

  /**
   * Optional result pattern for pattern-based execution.
   */
  resultPattern?: string;
}

/**
 * Factory class for creating PrimitiveExecutionContext instances.
 */
@injectable()
export class PrimitiveExecutionContextFactory {
  constructor(
    private readonly astParser: AstParser,
    private readonly astUtils: AstUtils,
  ) {}

  /**
   * Creates a PrimitiveExecutionContext from an EngineStepExecutionRequest.
   *
   * @param req The execution request
   * @returns The context object, or null if parsing fails
   */
  createFromRequest(
    req: EngineStepExecutionRequest,
  ): PrimitiveExecutionContext | null {
    const {
      expressionLatex,
      primitiveId,
      targetPath,
      bindings,
      resultPattern,
    } = req;

    // Parse the expression into an AST
    const root = this.astParser.parseExpression(expressionLatex);
    if (!root) return null;

    // Resolve the target node
    const targetNode = this.astUtils.getNodeAt(root, targetPath);

    return {
      root,
      targetNode,
      targetPath,
      primitiveId,
      astUtils: this.astUtils,
      bindings,
      resultPattern,
    };
  }

  /**
   * Creates a context directly from an AST and primitive info.
   * Useful for testing or when AST is already parsed.
   */
  createFromAst(
    root: AstNode,
    targetPath: string,
    primitiveId: PrimitiveId,
    options?: {
      bindings?: Record<string, any>;
      resultPattern?: string;
    },
  ): PrimitiveExecutionContext {
    const targetNode = this.astUtils.getNodeAt(root, targetPath);

    return {
      root,
      targetNode,
      targetPath,
      primitiveId,
      astUtils: this.astUtils,
      bindings: options?.bindings,
      resultPattern: options?.resultPattern,
    };
  }
}
