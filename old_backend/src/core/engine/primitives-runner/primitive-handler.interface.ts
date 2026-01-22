/**
 * Primitive Handler Interface
 *
 * Defines the contract for all primitive execution handlers.
 * Implements the Strategy Pattern for SOLID compliance.
 */

import { AstNode } from "@/core/ast";
import { PrimitiveId } from "@/core/primitive-master";
import { PrimitiveExecutionContext } from "./primitive-execution.context";

/**
 * Interface for primitive operation handlers.
 * Each handler is responsible for a specific category of primitives.
 */
export interface IPrimitiveHandler {
  /**
   * Returns the list of primitive IDs this handler supports.
   */
  getSupportedPrimitives(): PrimitiveId[];

  /**
   * Checks if this handler can process the given primitive.
   * @param primitiveId The primitive operation identifier.
   */
  canHandle(primitiveId: PrimitiveId): boolean;

  /**
   * Executes the primitive operation on the AST.
   * @param ctx The execution context containing all necessary data.
   * @returns The modified AST node, or undefined if the operation failed.
   */
  handle(ctx: PrimitiveExecutionContext): AstNode | undefined;
}
