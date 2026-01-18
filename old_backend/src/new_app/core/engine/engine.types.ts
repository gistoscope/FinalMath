/**
 * Engine Types
 *
 * Type definitions for step execution.
 */

export interface EngineStepExecutionResult {
  ok: boolean;
  newExpressionLatex?: string;
  errorCode?: string;
}

export interface EngineStepInput {
  expressionLatex: string;
  primitiveId: string;
  targetPath: string;
  bindings?: Record<string, unknown>;
}
