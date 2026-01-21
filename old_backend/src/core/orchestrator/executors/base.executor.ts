/**
 * Base Executor Interface
 *
 * Defines the contract for all primitive executors.
 * Each executor implements direct primitive transformations.
 */

/**
 * PrimitiveExecutor - Interface for primitive execution
 */
export interface PrimitiveExecutor {
  /**
   * Execute the primitive transformation
   * @param ast - The AST to transform
   * @param targetPath - Path to the target node
   * @param context - Optional execution context
   * @returns Execution result with new LaTeX or error
   */
  execute(ast: any, targetPath: string, context?: any): ExecutionResult;

  /**
   * Validate if the primitive can be applied
   * @param ast - The AST to validate
   * @param targetPath - Path to the target node
   * @returns Validation result
   */
  validate(ast: any, targetPath: string): ValidationResult;
}

/**
 * Result of primitive execution
 */
export type ExecutionResult = {
  ok: boolean;
  newLatex?: string;
  error?: string;
};

/**
 * Result of primitive validation
 */
export type ValidationResult = {
  ok: boolean;
  error?: string;
};
