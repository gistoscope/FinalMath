/**
 * EngineRunner Class
 *
 * Executes primitive operations on expressions.
 *
 * Responsibilities:
 *  - Execute primitives on AST
 *  - Return transformation results
 */

import { container, injectable } from "tsyringe";
import { PrimitiveRunner } from "./primitives-runner";
import type { EngineStepExecutionResult, EngineStepInput } from "./types.engine.js";

export interface EngineRunnerConfig {
  log?: (message: string) => void;
}

/**
 * EngineRunner - Executes step transformations
 */
@injectable()
export class EngineRunner {
  private readonly log: (message: string) => void = console.log;
  constructor(private readonly primitiveRunner: PrimitiveRunner) {}

  /**
   * Execute a step transformation.
   */
  async executeStep(input: EngineStepInput): Promise<EngineStepExecutionResult> {
    this.log(`[Engine] Executing primitive: ${input.primitiveId}`);

    try {
      // Delegate execution to the PrimitiveRunner
      const request = {
        expressionLatex: input.expressionLatex,
        targetPath: input.targetPath,
        primitiveId: input.primitiveId as any, // Cast to PrimitiveId
        invariantRuleId: input.invariantRuleId as any, // Cast if needed
        bindings: input.bindings,
        resultPattern: input.resultPattern,
      };

      return this.primitiveRunner.run(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log(`[Engine] Execution failed: ${message}`);
      return {
        ok: false,
        errorCode: "execution-error",
      };
    }
  }
}

/**
 * Factory function for EngineRunner
 */
export function createEngineRunner(): EngineRunner {
  return container.resolve(EngineRunner);
}

/**
 * Standalone function for backward compatibility
 */
export async function executeStepViaEngine(
  input: EngineStepInput
): Promise<EngineStepExecutionResult> {
  const runner = container.resolve(EngineRunner);
  return runner.executeStep(input);
}
