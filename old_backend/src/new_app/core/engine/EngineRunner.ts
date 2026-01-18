/**
 * EngineRunner Class
 *
 * Executes primitive operations on expressions.
 *
 * Responsibilities:
 *  - Execute primitives on AST
 *  - Return transformation results
 */

import type {
  EngineStepExecutionResult,
  EngineStepInput,
} from "./engine.types.js";

export interface EngineRunnerConfig {
  log?: (message: string) => void;
}

/**
 * EngineRunner - Executes step transformations
 */
export class EngineRunner {
  private readonly log: (message: string) => void;

  constructor(config?: EngineRunnerConfig) {
    this.log = config?.log || (() => {});
  }

  /**
   * Execute a step transformation.
   */
  async executeStep(
    input: EngineStepInput,
  ): Promise<EngineStepExecutionResult> {
    this.log(`[Engine] Executing primitive: ${input.primitiveId}`);

    try {
      // In a full implementation, this would delegate to primitive handlers
      // For now, return a successful result placeholder
      return {
        ok: true,
        newExpressionLatex: input.expressionLatex, // Placeholder
      };
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
export function createEngineRunner(config?: EngineRunnerConfig): EngineRunner {
  return new EngineRunner(config);
}

/**
 * Standalone function for backward compatibility
 */
export async function executeStepViaEngine(
  input: EngineStepInput,
): Promise<EngineStepExecutionResult> {
  const runner = new EngineRunner();
  return runner.executeStep(input);
}
