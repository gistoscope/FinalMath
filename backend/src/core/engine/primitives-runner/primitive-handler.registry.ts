/**
 * Primitive Handler Registry
 *
 * Central registry that maps primitive IDs to their handlers.
 * Implements the Strategy Pattern dispatcher.
 */

import { injectable } from "tsyringe";

import { AstNode } from "@/core/ast";
import { PrimitiveId } from "@/core/primitive-master";

import { FractionPrimitiveHandler } from "./handlers/fraction.handler";
import { IntegerPrimitiveHandler } from "./handlers/integer.handler";
import { NormalizationPrimitiveHandler } from "./handlers/normalization.handler";
import { StructuralPrimitiveHandler } from "./handlers/structural.handler";
import { PrimitiveExecutionContext } from "./primitive-execution.context";
import { IPrimitiveHandler } from "./primitive-handler.interface";

/**
 * Registry that manages all primitive handlers and dispatches execution.
 * Handlers are injected via constructor and mapped by their supported primitives.
 */
@injectable()
export class PrimitiveHandlerRegistry {
  private readonly handlerMap: Map<PrimitiveId, IPrimitiveHandler> = new Map();
  private readonly handlers: IPrimitiveHandler[];

  constructor(
    integerHandler: IntegerPrimitiveHandler,
    fractionHandler: FractionPrimitiveHandler,
    normalizationHandler: NormalizationPrimitiveHandler,
    structuralHandler: StructuralPrimitiveHandler
  ) {
    this.handlers = [integerHandler, fractionHandler, normalizationHandler, structuralHandler];
    this.buildHandlerMap();
  }

  /**
   * Builds the internal map from primitive IDs to handlers.
   */
  private buildHandlerMap(): void {
    for (const handler of this.handlers) {
      for (const primitiveId of handler.getSupportedPrimitives()) {
        if (this.handlerMap.has(primitiveId)) {
          console.warn(
            `[PrimitiveHandlerRegistry] Duplicate handler for ${primitiveId}, overwriting.`
          );
        }
        this.handlerMap.set(primitiveId, handler);
      }
    }

    console.log(
      `[PrimitiveHandlerRegistry] Registered ${this.handlerMap.size} primitives from ${this.handlers.length} handlers.`
    );
  }

  /**
   * Gets the handler for a specific primitive ID.
   *
   * @param primitiveId The primitive operation identifier
   * @returns The handler, or undefined if not found
   */
  getHandler(primitiveId: PrimitiveId): IPrimitiveHandler | undefined {
    return this.handlerMap.get(primitiveId);
  }

  /**
   * Checks if a handler exists for the given primitive ID.
   */
  hasHandler(primitiveId: PrimitiveId): boolean {
    return this.handlerMap.has(primitiveId);
  }

  /**
   * Executes a primitive operation using the appropriate handler.
   *
   * @param ctx The execution context
   * @returns The modified AST, or undefined if execution failed
   */
  execute(ctx: PrimitiveExecutionContext): AstNode | undefined {
    const handler = this.getHandler(ctx.primitiveId);

    if (!handler) {
      console.warn(`[PrimitiveHandlerRegistry] No handler found for ${ctx.primitiveId}`);
      return undefined;
    }

    return handler.handle(ctx);
  }

  /**
   * Returns all registered primitive IDs.
   */
  getRegisteredPrimitives(): PrimitiveId[] {
    return Array.from(this.handlerMap.keys());
  }

  /**
   * Returns all registered handlers.
   */
  getHandlers(): IPrimitiveHandler[] {
    return [...this.handlers];
  }

  /**
   * Returns the count of registered primitives.
   */
  get size(): number {
    return this.handlerMap.size;
  }
}
